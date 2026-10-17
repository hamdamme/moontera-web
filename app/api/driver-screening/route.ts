
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getScreeningDisclosures } from "@/lib/screening/disclosures";
import { createScreeningPdf, type ScreeningPdfData } from "@/lib/screening/pdf";
import { deliverScreeningRecord, type ScreeningRecord } from "@/lib/screening/delivery";
import { readActiveInvitation } from "@/lib/onboarding/invitations";
import { readPrivate, createPrivate, updatePrivate } from "@/lib/onboarding/private-store";
import { validAdminOrigin } from "@/lib/onboarding/admin-auth";
import type { RecordData } from "@/lib/applications/workflow";

export const runtime = "nodejs";
export const maxDuration = 60;

type ScreeningBody = {
  token: string;
  requestId: string;
  contentHash: string;
  mvr: { agreed: boolean; name: string };
  psp: { agreed: boolean; name: string };
  clearinghouse: { agreed: boolean; name: string };
  certification: { agreed: boolean; name: string; date: string };
};
type ScreeningPointer = { quickId: string; recordPath: string; signedAt: string; inviteHash: string };

function fail(message: string, status: number) {
  return Response.json({ success: false, message }, { status, headers: { "Cache-Control": "no-store" } });
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value && value <= new Date().toISOString().slice(0, 10);
}

function safeText(value: unknown, max = 150) {
  if (typeof value !== "string" || value.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) return "";
  return value.trim();
}

export async function POST(request: Request) {
  if (!validAdminOrigin(request)) return fail("Invalid request origin.", 403);
  if (Number(request.headers.get("content-length")) > 150000) return fail("Submission is too large.", 413);
  if (!request.headers.get("content-type")?.includes("application/json")) return fail("Send screening consent as JSON.", 415);
  if (!process.env.BLOB_READ_WRITE_TOKEN || !process.env.RESEND_API_KEY) return fail("Screening submission is unavailable.", 503);
  try {
    const reader = request.body?.getReader();
    if (!reader) return fail("Missing screening consent.", 400);
    const chunks: Uint8Array[] = [];
    let bodyLength = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bodyLength += part.value.length;
      if (bodyLength > 150000) {
        await reader.cancel();
        return fail("Submission is too large.", 413);
      }
      chunks.push(part.value);
    }
    let body: ScreeningBody;
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as ScreeningBody; }
    catch { return fail("Invalid screening consent.", 400); }
    const invitation = await readActiveInvitation(safeText(body.token, 64), "screening");
    if (!invitation) return fail("This Screening invitation is invalid or expired.", 401);
    const disclosure = getScreeningDisclosures();
    if (!disclosure.approved) return fail("Screening consent terms have not completed review.", 503);
    if (body.contentHash !== disclosure.contentHash) return fail("The disclosure has changed. Reload the invitation and review it again.", 409);
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(safeText(body.requestId, 36)))
      return fail("Refresh the page and try again.", 400);
    const mvrName = safeText(body.mvr?.name);
    const pspName = safeText(body.psp?.name);
    const clearinghouseName = safeText(body.clearinghouse?.name);
    const certificationName = safeText(body.certification?.name);
    if (
      body.mvr?.agreed !== true || body.psp?.agreed !== true ||
      body.clearinghouse?.agreed !== true || body.certification?.agreed !== true ||
      !mvrName || !pspName || !clearinghouseName || !certificationName ||
      !validDate(safeText(body.certification?.date, 10))
    ) return fail("Complete every acknowledgment, typed name, and certification date.", 400);
    const names = [mvrName, pspName, clearinghouseName, certificationName].map((name) => name.toLowerCase());
    if (new Set(names).size !== 1) return fail("Enter the same full legal name for each screening acknowledgment.", 400);
    const recordPath = `onboarding/screening/records/${invitation.quickId}/${invitation.tokenHash}.json`;
    let stored = await readPrivate<ScreeningRecord>(recordPath);
    if (!stored) {
      const quick = await readPrivate<RecordData>(invitation.quickPath);
      if (!quick || quick.value.id !== invitation.quickId || quick.value.payload.kind !== "quick" || !quick.value.complete || quick.value.payload.email !== invitation.email)
        return fail("The application linked to this invitation is unavailable.", 404);
      const id = randomUUID();
      const submittedAt = new Date().toISOString();
      const pdfData: ScreeningPdfData = {
        id,
        name: quick.value.payload.name,
        email: invitation.email,
        submittedAt,
        certificationDate: body.certification.date,
        mvrName,
        pspName,
        clearinghouseName,
        certificationName,
        signedAt: submittedAt,
        disclosureHash: disclosure.contentHash,
      };
      const [font, template] = await Promise.all([
        readFile(path.join(process.cwd(), "public/fonts/Geist-Regular.ttf")),
        readFile(path.join(process.cwd(), "assets/application-reference.pdf")),
      ]);
      const pdf = await createScreeningPdf(pdfData, disclosure, font, template);
      const record: ScreeningRecord = {
        ...pdfData,
        quickId: invitation.quickId,
        inviteHash: invitation.tokenHash,
        requestId: body.requestId,
        pdf: Buffer.from(pdf).toString("base64"),
      };
      const etag = await createPrivate(recordPath, record);
      stored = etag ? { value: record, etag } : await readPrivate<ScreeningRecord>(recordPath);
      if (!stored) return fail("Screening consent could not be saved. Please retry.", 503);
    } else if (stored.value.inviteHash !== invitation.tokenHash) {
      return fail("Screening consent record conflict. Contact Moontera for assistance.", 409);
    }
    const pointerPath = `onboarding/screening/${invitation.quickId}.json`;
    const pointer = await readPrivate<ScreeningPointer>(pointerPath);
    if (pointer?.value.recordPath !== recordPath) {
      const nextPointer: ScreeningPointer = {
        quickId: invitation.quickId,
        recordPath,
        signedAt: stored.value.signedAt,
        inviteHash: invitation.tokenHash,
      };
      const savedPointer = pointer
        ? await updatePrivate(pointerPath, nextPointer, pointer.etag)
        : await createPrivate(pointerPath, nextPointer);
      if (!savedPointer) return fail("The consent is saved but its workflow status needs attention. Retry to finish delivery.", 503);
    }
    const delivered = await deliverScreeningRecord(recordPath);
    return Response.json(
      { success: true, id: delivered.id, alreadySubmitted: !!stored.value.ownerEmailId && !!stored.value.applicantEmailId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Screening submission failed", error instanceof Error ? error.name : "Unknown error");
    if (error instanceof Error && error.message.includes("manual owner attention"))
      return fail("This saved consent needs delivery review. Contact info@moonterallc.com and do not submit a new Screening form.", 503);
    if (error instanceof Error && error.message.includes("Moontera screening email delivery failed"))
      return fail("Your signed consent is saved, but Moontera has not received the PDF email yet. Retry this submission or contact info@moonterallc.com. Do not start a new form.", 503);
    return fail("Your signed screening consent is saved or can be retried. Contact info@moonterallc.com if delivery does not complete.", 503);
  }
}
