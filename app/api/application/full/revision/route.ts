import { createHash, createHmac, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";
import { validateSubmission, InputError, type Submission } from "@/lib/applications/model";
import { createSubmissionPdf } from "@/lib/applications/submission-pdf";
import { getFullApplicantSession } from "@/lib/onboarding/full-auth";
import { createPrivate, readPrivate, updatePrivate } from "@/lib/onboarding/private-store";
import { validAdminOrigin } from "@/lib/onboarding/admin-auth";
import type { RecordData } from "@/lib/applications/workflow";

export const runtime = "nodejs";
export const maxDuration = 60;

type RevisionIndex = {
  latestRevision: number;
  latestPath: string | null;
  pending?: { requestId: string; revision: number; path: string };
};
type FullRevision = {
  id: string;
  requestId: string;
  quickId: string;
  revisionNumber: number;
  payload: Submission;
  digest: string;
  createdAt: string;
  signedAt: string;
  pdf: string;
  complete: boolean;
  ownerEmailId?: string;
  applicantEmailId?: string;
  attemptStartedAt?: number;
};

function fail(message: string, status: number) {
  return Response.json({ success: false, message }, { status, headers: { "Cache-Control": "no-store" } });
}

async function sendRevision(record: FullRevision) {
  const key = `onboarding/full-revisions/${record.quickId}/requests/${record.requestId}.json`;
  const stored = await readPrivate<FullRevision>(key);
  if (!stored) throw new Error("Revision record is missing");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.APPLICATION_FROM || "Moontera LLC <info@moonterallc.com>";
  const send = async (recipient: "owner" | "applicant") => {
    const owner = recipient === "owner";
    const { data, error } = await resend.emails.send(
      {
        from,
        to: [owner ? "llcmoontera@gmail.com" : record.payload.email],
        replyTo: owner ? record.payload.email : "info@moonterallc.com",
        subject: owner
          ? `Revised Full Driver Application - Revision ${record.revisionNumber}`
          : `Application update received - Moontera LLC`,
        text: owner
          ? `${record.payload.name} certified Revision ${record.revisionNumber} of the Full Driver Application. The revised PDF is attached.\nReference: ${record.id}\nReceived: ${record.createdAt}`
          : `Hello ${record.payload.name},\n\nYour signed Full Driver Application revision ${record.revisionNumber} has been received by Moontera LLC. A copy is not attached to this email.\nReference: ${record.id}\n\nQuestions? Contact info@moonterallc.com or 773-882-5595.\n\nMoontera LLC`,
        ...(owner ? { attachments: [{ filename: `Moontera-Full-Application-Revision-${record.revisionNumber}.pdf`, content: record.pdf }] } : {}),
      },
      { idempotencyKey: `full-revision/${record.id}/${recipient}` },
    );
    if (error || !data?.id) throw new Error("Revision email delivery failed");
    return data.id;
  };
  let current = stored.value;
  let etag = stored.etag;
  if (!current.complete && current.attemptStartedAt && Date.now() - current.attemptStartedAt > 23 * 60 * 60 * 1000) {
    throw new Error("Revision delivery needs manual owner attention");
  }
  if (!current.complete && !current.attemptStartedAt) {
    const started = Date.now();
    const next = await updatePrivate(key, { ...current, attemptStartedAt: started }, etag);
    if (!next) throw new Error("Revision delivery state changed");
    current = { ...current, attemptStartedAt: started };
    etag = next;
  }
  for (const recipient of ["owner", "applicant"] as const) {
    const field = recipient === "owner" ? "ownerEmailId" : "applicantEmailId";
    if (current[field]) continue;
    const id = await send(recipient);
    const next = await updatePrivate(key, { ...current, [field]: id }, etag);
    if (!next) throw new Error("Revision delivery state changed");
    current = { ...current, [field]: id };
    etag = next;
  }
  if (!current.complete) {
    const next = await updatePrivate(key, { ...current, complete: true }, etag);
    if (!next) throw new Error("Revision record changed during delivery");
    current = { ...current, complete: true };
  }
  return current;
}

export async function POST(request: Request) {
  if (!validAdminOrigin(request)) return fail("Invalid request origin.", 403);
  if (Number(request.headers.get("content-length")) > 750000) return fail("Application is too large.", 413);
  try {
    const session = await getFullApplicantSession(request);
    if (!session) return fail("Verify your invitation before signing a revision.", 401);
    const reader = request.body?.getReader();
    if (!reader) return fail("Missing application.", 400);
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.length;
      if (length > 750000) { await reader.cancel(); return fail("Application is too large.", 413); }
      chunks.push(part.value);
    }
    let input: unknown;
    try { input = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { return fail("Invalid application data.", 400); }
    const payload = validateSubmission("full", input);
    if (payload.email !== session.email) return fail("Verify the invitation email before signing a revision.", 403);
    if (!process.env.BLOB_READ_WRITE_TOKEN || !process.env.RESEND_API_KEY || !process.env.APPLICATION_KEY_SECRET)
      return fail("Application revisions are temporarily unavailable.", 503);

    // This key is HMAC-based in the original intake service; use the same derivation.
    const secureEmailHash = createHmac("sha256", process.env.APPLICATION_KEY_SECRET).update(session.email).digest("hex");
    const base = await readPrivate<RecordData>(`applications/full/${secureEmailHash}.json`);
    const indexPath = `onboarding/full-revisions/${session.quickId}/index.json`;
    let index = await readPrivate<RevisionIndex>(indexPath);
    if (!base?.value.complete || base.value.payload.kind !== "full" || base.value.payload.email !== session.email)
      return fail("A signed Full Application is not on file yet.", 409);
    if (!index) {
      const first = { latestRevision: 0, latestPath: null } satisfies RevisionIndex;
      const etag = await createPrivate(indexPath, first);
      index = etag ? { value: first, etag } : await readPrivate<RevisionIndex>(indexPath);
    }
    if (!index) return fail("Could not load revision history. Retry shortly.", 503);

    const requestId = payload.requestId;
    const requestPath = `onboarding/full-revisions/${session.quickId}/requests/${requestId}.json`;
    let revision = await readPrivate<FullRevision>(requestPath);
    if (!revision) {
      let latest: Submission = base.value.payload;
      if (index.value.latestPath) {
        const latestRevision = await readPrivate<FullRevision>(index.value.latestPath);
        if (!latestRevision?.value.complete) return fail("Another revision is still being processed. Retry shortly.", 409);
        latest = latestRevision.value.payload;
      }
      const oldAnswers = JSON.stringify(latest.answers || {});
      const newAnswers = JSON.stringify(payload.answers || {});
      if (oldAnswers === newAnswers)
        return fail("There are no application changes to certify.", 409);
      if (index.value.pending && index.value.pending.requestId !== requestId)
        return fail("Another revision is still being processed. Retry shortly.", 409);

      const revisionNumber = index.value.pending?.revision || index.value.latestRevision + 1;
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      const [font, template] = await Promise.all([
        readFile(path.join(process.cwd(), "public/fonts/Geist-Regular.ttf")),
        readFile(path.join(process.cwd(), "assets/application-reference.pdf")),
      ]);
      const pdf = Buffer.from(await createSubmissionPdf(payload, id, createdAt, font, template, revisionNumber)).toString("base64");
      const record: FullRevision = {
        id, requestId, quickId: session.quickId, revisionNumber, payload,
        digest: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
        createdAt, signedAt: createdAt, pdf, complete: false,
      };
      if (!index.value.pending) {
        const reserved = await updatePrivate(indexPath, {
          ...index.value,
          pending: { requestId, revision: revisionNumber, path: requestPath },
        }, index.etag);
        if (!reserved) return fail("Another revision is being saved. Retry shortly.", 409);
      }
      const saved = await createPrivate(requestPath, record);
      revision = saved ? { value: record, etag: saved } : await readPrivate<FullRevision>(requestPath);
      if (!revision || revision.value.digest !== record.digest)
        return fail("This revision could not be saved safely. Retry with the same answers.", 503);
    } else if (revision.value.digest !== createHash("sha256").update(JSON.stringify(payload)).digest("hex")) {
      return fail("This signed revision request is already in progress. Retry without changing it.", 409);
    }

    const delivered = await sendRevision(revision.value);
    const currentIndex = await readPrivate<RevisionIndex>(indexPath);
    if (!currentIndex || currentIndex.value.pending?.requestId !== requestId)
      return fail("Revision is delivered but history needs attention. Contact Moontera.", 503);
    const savedIndex = await updatePrivate(indexPath, {
      latestRevision: delivered.revisionNumber,
      latestPath: requestPath,
    }, currentIndex.etag);
    if (!savedIndex) return fail("Revision is delivered but history needs attention. Retry shortly.", 503);
    return Response.json({ success: true, id: delivered.id, revisionNumber: delivered.revisionNumber }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof InputError) return fail(error.message, 400);
    console.error("Full application revision failed", error instanceof Error ? error.name : "Unknown error");
    if (error instanceof Error && error.message.includes("manual owner attention"))
      return fail("This saved revision needs delivery review. Contact info@moonterallc.com and do not create another revision.", 503);
    return fail("Revision delivery is not complete. Retry the same signed revision; do not create another.", 503);
  }
}
