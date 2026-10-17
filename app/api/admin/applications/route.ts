
import { createHmac } from "node:crypto";
import { getAdminSession, validAdminOrigin } from "@/lib/onboarding/admin-auth";
import { findQuickRecord, listApplicationRecords, toApplicationSummary } from "@/lib/onboarding/records";
import { activeInvitationStatus, issueInvitation, revokeInvitation, type InvitationPurpose } from "@/lib/onboarding/invitations";
import { deletePrivate, readPrivate } from "@/lib/onboarding/private-store";
import { list as listBlobs } from "@vercel/blob";
import type { RecordData } from "@/lib/applications/workflow";
import { deliverScreeningRecord } from "@/lib/screening/delivery";
import { JsonBodyError, readJsonBody } from "@/lib/http/read-json-body";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    if (!(await getAdminSession(request)))
      return Response.json({ message: "Sign in required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const cursor = new URL(request.url).searchParams.get("cursor") || undefined;
    if (cursor && cursor.length > 2048)
      return Response.json({ message: "Invalid page cursor." }, { status: 400 });
    const result = await listApplicationRecords(cursor);
    const applications = await Promise.all(
      result.records.map(async ({ record }) => {
        const screening = await readPrivate<{ signedAt?: string; recordPath?: string }>(
          `onboarding/screening/${record.id}.json`,
        );
        const screeningEmail = screening?.value.recordPath
          ? await readPrivate<{ ownerEmailId?: string; applicantEmailId?: string }>(screening.value.recordPath)
          : null;
        const [screeningInvite, fullInvite] = await Promise.all([
          activeInvitationStatus(record.id, "screening"),
          activeInvitationStatus(record.id, "full"),
        ]);
        const fullKey = process.env.APPLICATION_KEY_SECRET
          ? `applications/full/${createHmac("sha256", process.env.APPLICATION_KEY_SECRET).update(record.payload.email).digest("hex")}.json`
          : "";
        const fullRecord = fullKey ? await readPrivate<RecordData>(fullKey) : null;
        const fullRevision = await readPrivate<{ latestRevision?: number }>(`onboarding/full-revisions/${record.id}/index.json`);
        return {
          ...toApplicationSummary(record),
          screeningSigned: !!screening?.value.signedAt,
          screeningOwnerEmailSent: !!screeningEmail?.value.ownerEmailId,
          screeningApplicantEmailSent: !!screeningEmail?.value.applicantEmailId,
          screeningInviteExpiresAt: screeningInvite?.expiresAt || null,
          fullInviteExpiresAt: fullInvite?.expiresAt || null,
          fullReceived: !!fullRecord?.value.complete && fullRecord.value.payload.kind === "full",
          fullRevisionNumber: fullRevision?.value.latestRevision || 0,
        };
      }),
    );
    applications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return Response.json(
      { applications, nextCursor: result.cursor },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { message: "Applications could not be loaded." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  if (!validAdminOrigin(request))
    return Response.json({ message: "Invalid request origin." }, { status: 403 });
  try {
    if (!(await getAdminSession(request)))
      return Response.json({ message: "Sign in required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const body = await readJsonBody(request, 8192);
    if (body?.action === "retry-screening-email") {
      if (typeof body.id !== "string" || !/^[a-f0-9-]{36}$/i.test(body.id))
        return Response.json({ message: "Invalid application request." }, { status: 400 });
      const located = await findQuickRecord(body.id);
      if (!located) return Response.json({ message: "Application not found." }, { status: 404 });
      const pointer = await readPrivate<{ quickId?: string; recordPath?: string; signedAt?: string }>(`onboarding/screening/${body.id}.json`);
      if (pointer?.value.quickId !== body.id || !pointer.value.signedAt || !pointer.value.recordPath?.startsWith(`onboarding/screening/records/${body.id}/`))
        return Response.json({ message: "There is no signed Screening record to deliver." }, { status: 404 });
      try {
        const record = await deliverScreeningRecord(pointer.value.recordPath);
        return Response.json({ success: true, ownerEmailSent: !!record.ownerEmailId, applicantEmailSent: !!record.applicantEmailId }, { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Screening email delivery failed.";
        return Response.json({ message }, { status: 503, headers: { "Cache-Control": "no-store" } });
      }
    }
    if (body?.action === "delete") {
      if (typeof body.id !== "string" || !/^[a-f0-9-]{36}$/i.test(body.id))
        return Response.json({ message: "Invalid application request." }, { status: 400 });
      const located = await findQuickRecord(body.id);
      if (!located) return Response.json({ message: "Application not found." }, { status: 404 });
      const current = await readPrivate<RecordData>(located.pathname);
      if (!current || current.value.id !== body.id)
        return Response.json({ message: "Application not found." }, { status: 404 });
      const paths = new Set<string>();
      const listPaths = async (prefix: string) => {
        let cursor: string | undefined;
        for (let page = 0; page < 100; page++) {
          const result = await listBlobs({ prefix, limit: 1000, ...(cursor ? { cursor } : {}) });
          for (const blob of result.blobs) paths.add(blob.pathname);
          if (!result.hasMore) return;
          cursor = result.cursor;
        }
        throw new Error("Linked application records exceed the deletion safety limit");
      };
      const quickId = body.id;
      const screeningKey = `onboarding/screening/${quickId}.json`;
      const screening = await readPrivate<{ quickId?: string; recordPath?: string }>(screeningKey);
      if (screening?.value.quickId === quickId) {
        paths.add(screeningKey);
        if (screening.value.recordPath?.startsWith(`onboarding/screening/records/${quickId}/`)) {
          paths.add(screening.value.recordPath);
          await listPaths(`onboarding/screening/records/${quickId}/`);
        }
      }

      for (const purpose of ["screening", "full"] as const)
        paths.add(`onboarding/active-invitations/${purpose}/${quickId}.json`);

      await listPaths("onboarding/invitations/");
      const inviteHashes = new Set<string>();
      for (const pathname of [...paths].filter((path) => path.startsWith("onboarding/invitations/"))) {
        const invitation = await readPrivate<{ quickId?: string; tokenHash?: string; purpose?: string }>(pathname);
        if (invitation?.value.quickId === quickId) {
          paths.add(pathname);
          if (invitation.value.tokenHash) inviteHashes.add(invitation.value.tokenHash);
        } else {
          paths.delete(pathname);
        }
      }

      paths.add(`onboarding/full-drafts/${quickId}.json`);
      await listPaths(`onboarding/full-revisions/${quickId}/`);

      const emailHash = createHmac("sha256", process.env.APPLICATION_KEY_SECRET || "")
        .update(current.value.payload.email)
        .digest("hex");
      const fullPath = `applications/full/${emailHash}.json`;
      const full = process.env.APPLICATION_KEY_SECRET
        ? await readPrivate<RecordData>(fullPath)
        : null;
      if (full?.value.sourceQuickId === quickId) paths.add(fullPath);

      if (inviteHashes.size) {
        for (const prefix of ["onboarding/full-otp/", "onboarding/full-sessions/"]) {
          await listPaths(prefix);
          for (const pathname of [...paths].filter((path) => path.startsWith(prefix))) {
            const related = await readPrivate<{ inviteHash?: string }>(pathname);
            if (related?.value.inviteHash && inviteHashes.has(related.value.inviteHash))
              paths.add(pathname);
            else paths.delete(pathname);
          }
        }
      }

      const emailFile = located.pathname.split("/").at(-1);
      if (emailFile) {
        const prefix = `applications/quick/history/${emailFile.replace(/\.json$/, "")}/`;
        await listPaths(prefix);
        for (const pathname of [...paths].filter((path) => path.startsWith(prefix))) {
          const archived = await readPrivate<RecordData>(pathname);
          if (archived?.value.id !== quickId) paths.delete(pathname);
        }
      }

      paths.add(located.pathname);
      for (const pathname of paths) await deletePrivate(pathname);
      return Response.json({ success: true, deleted: true }, { headers: { "Cache-Control": "no-store" } });
    }
    if (body?.action === "revoke-invitation") {
      const purposeValue = body.purpose;
      if (
        typeof body.quickId !== "string" ||
        !/^[a-f0-9-]{36}$/i.test(body.quickId) ||
        !["screening", "full"].includes(purposeValue as string)
      )
        return Response.json({ message: "Invalid invitation request." }, { status: 400 });
      const purpose = purposeValue as InvitationPurpose;
      const revoked = await revokeInvitation(body.quickId, purpose);
      return Response.json({ success: true, revoked }, { headers: { "Cache-Control": "no-store" } });
    }
    if (body?.action === "invite") {
      const purposeValue = body.purpose;
      if (
        typeof body.quickId !== "string" ||
        !/^[a-f0-9-]{36}$/i.test(body.quickId) ||
        !["screening", "full"].includes(purposeValue as string)
      )
        return Response.json({ message: "Invalid invitation request." }, { status: 400 });
      const purpose = purposeValue as InvitationPurpose;
      try {
        const result = await issueInvitation(body.quickId, purpose);
        return Response.json({ success: true, ...result }, { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invitation could not be issued.";
        return Response.json({ success: false, message }, { status: message.startsWith("A signed Screening") ? 409 : 503 });
      }
    }
    if (body?.action !== "view" || typeof body.id !== "string" || !/^[a-f0-9-]{36}$/i.test(body.id))
      return Response.json({ message: "Invalid application request." }, { status: 400 });
    const located = await findQuickRecord(body.id);
    if (!located)
      return Response.json({ message: "Application not found." }, { status: 404 });
    const { record } = located;
    const screening = await readPrivate<{ signedAt?: string; recordPath?: string }>(`onboarding/screening/${record.id}.json`);
    const emailHash = createHmac("sha256", process.env.APPLICATION_KEY_SECRET || "").update(record.payload.email).digest("hex");
    const full = process.env.APPLICATION_KEY_SECRET
      ? await readPrivate<RecordData>(`applications/full/${emailHash}.json`)
      : null;
    const fullRevision = await readPrivate<{ latestRevision?: number }>(`onboarding/full-revisions/${record.id}/index.json`);
    return Response.json(
      {
        id: record.id,
        receivedAt: record.createdAt,
        complete: record.complete,
        applicant: record.payload.quick,
        hasQuickPdf: !!record.pdf,
        screeningSigned: !!screening?.value.signedAt,
        hasScreeningPdf: !!screening?.value.recordPath,
        hasFullPdf: !!full?.value.complete && full.value.payload.kind === "full",
        fullRevisionNumber: fullRevision?.value.latestRevision || 0,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof JsonBodyError)
      return Response.json(
        { message: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    return Response.json(
      { message: "Application could not be opened." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
