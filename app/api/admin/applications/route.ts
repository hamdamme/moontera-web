
import { createHmac } from "node:crypto";
import { getAdminSession, validAdminOrigin } from "@/lib/onboarding/admin-auth";
import { findQuickRecord, listApplicationRecords, toApplicationSummary } from "@/lib/onboarding/records";
import { activeInvitationStatus, issueInvitation, revokeInvitation, type InvitationPurpose } from "@/lib/onboarding/invitations";
import { deletePrivate, readPrivate } from "@/lib/onboarding/private-store";
import { list as listBlobs } from "@vercel/blob";
import type { RecordData } from "@/lib/applications/workflow";
import { deliverScreeningRecord } from "@/lib/screening/delivery";
import { JsonBodyError, readJsonBody } from "@/lib/http/read-json-body";
import { ensurePolicyInvitation, policyConsentPath, policyInvitePath } from "@/lib/onboarding/policy-consents";
import { applicationBaseUrl } from "@/lib/onboarding/urls";
import { Resend } from "resend";
import { deliverPolicyConsent } from "@/lib/applications/policy-delivery";

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
        const policyConsent = fullRecord?.value.complete && fullRecord.value.payload.kind === "full"
          ? await readPrivate<{ submittedAt?: string; ownerEmailId?: string; applicantEmailId?: string }>(policyConsentPath(record.id, fullRecord.value.id))
          : null;
        const fullRevision = await readPrivate<{ latestRevision?: number }>(`onboarding/full-revisions/${record.id}/index.json`);
        const fullDraft = await readPrivate<{ quickId?: string }>(`onboarding/full-drafts/${record.id}.json`);
        return {
          ...toApplicationSummary(record),
          screeningSigned: !!screening?.value.signedAt,
          screeningOwnerEmailSent: !!screeningEmail?.value.ownerEmailId,
          screeningApplicantEmailSent: !!screeningEmail?.value.applicantEmailId,
          screeningInviteExpiresAt: screeningInvite?.expiresAt || null,
          fullInviteExpiresAt: fullInvite?.expiresAt || null,
          fullReceived: !!fullRecord?.value.complete && fullRecord.value.payload.kind === "full",
          fullStarted: fullDraft?.value.quickId === record.id,
          fullApplicationId: fullRecord?.value.payload.kind === "full" ? fullRecord.value.id : null,
          fullRevisionNumber: fullRevision?.value.latestRevision || 0,
          policiesSignedAt: policyConsent?.value.submittedAt || null,
          policiesOwnerEmailSent: !!policyConsent?.value.ownerEmailId,
          policiesApplicantEmailSent: !!policyConsent?.value.applicantEmailId,
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
    if (body?.action === "retry-policy-email") {
      if (typeof body.id !== "string" || !/^[a-f0-9-]{36}$/i.test(body.id) || typeof body.fullId !== "string" || !/^[a-f0-9-]{36}$/i.test(body.fullId))
        return Response.json({ message: "Select the signed Full Application." }, { status: 400 });
      const path = policyConsentPath(body.id, body.fullId);
      if (!(await readPrivate(path))) return Response.json({ message: "There is no signed policy packet to deliver." }, { status: 404 });
      try {
        const delivered = await deliverPolicyConsent(path);
        return Response.json({ success: true, ownerEmailSent: !!delivered.ownerEmailId, applicantEmailSent: !!delivered.applicantEmailId }, { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Signed policy email delivery failed.";
        return Response.json({ message }, { status: 503, headers: { "Cache-Control": "no-store" } });
      }
    }
    if (body?.action === "send-policy-invitation") {
      if (typeof body.id !== "string" || !/^[a-f0-9-]{36}$/i.test(body.id) || typeof body.fullId !== "string" || !/^[a-f0-9-]{36}$/i.test(body.fullId))
        return Response.json({ message: "Select the completed Full Application." }, { status: 400 });
      if (!process.env.APPLICATION_KEY_SECRET || !process.env.RESEND_API_KEY)
        return Response.json({ message: "Policy email is temporarily unavailable." }, { status: 503 });
      const quick = await findQuickRecord(body.id);
      if (!quick?.record.complete) return Response.json({ message: "Quick Application not found." }, { status: 404 });
      const emailHash = createHmac("sha256", process.env.APPLICATION_KEY_SECRET).update(quick.record.payload.email).digest("hex");
      const full = await readPrivate<RecordData>(`applications/full/${emailHash}.json`);
      if (!full || full.value.id !== body.fullId || full.value.deletedAt || !full.value.complete || full.value.sourceQuickId !== quick.record.id)
        return Response.json({ message: "The selected completed Full Application was not found." }, { status: 404 });
      const token = await ensurePolicyInvitation(full.value.id, quick.record.id, full.value.payload.email);
      const href = `${applicationBaseUrl()}/apply/documents#quickId=${encodeURIComponent(quick.record.id)}&fullId=${encodeURIComponent(full.value.id)}&token=${token}`;
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = process.env.APPLICATION_FROM || "Moontera LLC <info@moonterallc.com>";
      const { data, error } = await resend.emails.send({
        from, to: [full.value.payload.email], replyTo: "info@moonterallc.com",
        subject: "Moontera LLC - review and sign driver policies",
        text: `Hello ${full.value.payload.name},\n\nPlease read and acknowledge the three Moontera driver policies using this secure link. It expires in 14 days.\n\n${href}\n\nAfter you finish, you and Moontera will each receive the signed PDF showing your name and signing date.\n\nQuestions? Contact info@moonterallc.com or 773-882-5595.\n\nMoontera LLC`,
      }, { idempotencyKey: `policy-invitation/${full.value.id}/${token}` });
      if (error || !data?.id) return Response.json({ message: "The policy link could not be emailed. Retry shortly." }, { status: 503 });
      return Response.json({ success: true, email: full.value.payload.email }, { headers: { "Cache-Control": "no-store" } });
    }
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
      const recordType = body.recordType;
      if (!["quick", "screening", "full"].includes(recordType as string))
        return Response.json({ message: "Choose Quick, Screening, or Full Application." }, { status: 400 });
      const located = await findQuickRecord(body.id);
      if (!located) return Response.json({ message: "Application not found." }, { status: 404 });
      const current = await readPrivate<RecordData>(located.pathname);
      if (!current || current.value.id !== body.id)
        return Response.json({ message: "Application not found." }, { status: 404 });
      const paths = new Set<string>();
      const listPaths = async (prefix: string) => {
        const matches: string[] = [];
        let cursor: string | undefined;
        for (let page = 0; page < 100; page++) {
          const result = await listBlobs({ prefix, limit: 1000, ...(cursor ? { cursor } : {}) });
          for (const blob of result.blobs) matches.push(blob.pathname);
          if (!result.hasMore) return matches;
          cursor = result.cursor;
        }
        throw new Error("Linked application records exceed the deletion safety limit");
      };
      const quickId = body.id;
      if (recordType === "quick") {
        paths.add(located.pathname);
        const emailFile = located.pathname.split("/").at(-1);
        if (emailFile) {
          const prefix = `applications/quick/history/${emailFile.replace(/\.json$/, "")}/`;
          for (const pathname of await listPaths(prefix)) {
            const archived = await readPrivate<RecordData>(pathname);
            if (archived?.value.id === quickId) paths.add(pathname);
          }
        }
      }
      const inviteHashes = new Set<string>();
      if (recordType === "screening" || recordType === "full") {
        const purpose = recordType;
        const invitationPaths = await listPaths("onboarding/invitations/");
        const invitations = await Promise.all(invitationPaths.map(async (pathname) => ({
          pathname,
          stored: await readPrivate<{ quickId?: string; tokenHash?: string; purpose?: string }>(pathname),
        })));
        for (const { pathname, stored } of invitations) {
          const invitation = stored?.value;
          if (invitation?.quickId === quickId && invitation.purpose === purpose) {
            paths.add(pathname);
            if (invitation.tokenHash) inviteHashes.add(invitation.tokenHash);
          }
        }
        const activePath = `onboarding/active-invitations/${purpose}/${quickId}.json`;
        if (await readPrivate(activePath)) paths.add(activePath);
        if (purpose === "screening") {
          const screeningPath = `onboarding/screening/${quickId}.json`;
          const screening = await readPrivate<{ quickId?: string }>(screeningPath);
          if (screening?.value.quickId === quickId) paths.add(screeningPath);
          for (const pathname of await listPaths(`onboarding/screening/records/${quickId}/`))
            paths.add(pathname);
        } else {
          const fullId = body.fullId;
          if (fullId !== null && fullId !== undefined && (typeof fullId !== "string" || !/^[a-f0-9-]{36}$/i.test(fullId)))
            return Response.json({ message: "Select the Full Application you want to delete." }, { status: 400 });
          if (fullId) {
            if (!process.env.APPLICATION_KEY_SECRET)
              return Response.json({ message: "Full Application storage is unavailable." }, { status: 503 });
            const emailHash = createHmac("sha256", process.env.APPLICATION_KEY_SECRET)
              .update(current.value.payload.email)
              .digest("hex");
            const fullPath = `applications/full/${emailHash}.json`;
            const full = await readPrivate<RecordData>(fullPath);
            if (!full || full.value.id !== fullId || full.value.payload.kind !== "full")
              return Response.json({ message: "The selected Full Application was not found." }, { status: 404 });
            paths.add(fullPath);
            for (const linkedPath of [policyInvitePath(fullId), policyConsentPath(quickId, fullId)])
              if (await readPrivate(linkedPath)) paths.add(linkedPath);
          }
          const draftPath = `onboarding/full-drafts/${quickId}.json`;
          if (await readPrivate(draftPath)) paths.add(draftPath);
          for (const pathname of await listPaths(`onboarding/full-revisions/${quickId}/`))
            paths.add(pathname);
          for (const prefix of ["onboarding/full-otp/", "onboarding/full-sessions/"]) {
            for (const pathname of await listPaths(prefix)) {
              const related = await readPrivate<{ inviteHash?: string }>(pathname);
              if (related?.value.inviteHash && inviteHashes.has(related.value.inviteHash))
                paths.add(pathname);
            }
          }
        }
      }
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
