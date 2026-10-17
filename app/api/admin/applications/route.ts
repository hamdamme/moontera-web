import { createHmac } from "node:crypto";
import { getAdminSession, validAdminOrigin } from "@/lib/onboarding/admin-auth";
import { findQuickRecord, listApplicationRecords, toApplicationSummary } from "@/lib/onboarding/records";
import { activeInvitationStatus, issueInvitation, revokeInvitation, type InvitationPurpose } from "@/lib/onboarding/invitations";
import { readPrivate } from "@/lib/onboarding/private-store";
import type { RecordData } from "@/lib/applications/workflow";
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
        const screening = await readPrivate<{ signedAt?: string }>(
          `onboarding/screening/${record.id}.json`,
        );
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
