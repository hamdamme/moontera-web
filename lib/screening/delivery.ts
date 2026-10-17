
import { Resend } from "resend";
import { readPrivate, updatePrivate } from "@/lib/onboarding/private-store";
import type { ScreeningPdfData } from "./pdf";

export type ScreeningRecord = ScreeningPdfData & {
  quickId: string;
  inviteHash: string;
  requestId: string;
  pdf: string;
  attemptStartedAt?: number;
  ownerEmailId?: string;
  applicantEmailId?: string;
};

export async function deliverScreeningRecord(recordPath: string) {
  if (!process.env.RESEND_API_KEY) throw new Error("Screening email delivery is not configured");
  const stored = await readPrivate<ScreeningRecord>(recordPath);
  if (!stored) throw new Error("Saved screening record not found");
  const record = stored.value;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.APPLICATION_FROM || "Moontera LLC <info@moonterallc.com>";
  const send = async (recipient: "owner" | "applicant") => {
    const owner = recipient === "owner";
    const { data, error } = await resend.emails.send(
      {
        from,
        to: [owner ? "llcmoontera@gmail.com" : record.email],
        replyTo: owner ? record.email : "info@moonterallc.com",
        subject: owner
          ? `Screening Consents - ${record.name}`
          : "Screening consents submitted - Moontera LLC",
        text: owner
          ? `${record.name} submitted driver screening consents. The completed PDF is attached.\nReference: ${record.id}\nReceived: ${record.submittedAt}\nVerified email: ${record.email}`
          : `Hello ${record.name},\n\nYour Screening Consents were submitted to Moontera LLC. A copy is not attached to this email.\nReference: ${record.id}\n\nQuestions? Contact info@moonterallc.com or 773-882-5595.\n\nMoontera LLC`,
        ...(owner
          ? { attachments: [{ filename: `Moontera-Screening-Consents-${record.id.slice(0, 8)}.pdf`, content: record.pdf }] }
          : {}),
      },
      { idempotencyKey: `screening/${record.id}/${recipient}` },
    );
    if (error || !data?.id) throw new Error(`${owner ? "Moontera" : "Driver"} screening email delivery failed`);
    return data.id;
  };

  let current = stored.value;
  let etag = stored.etag;
  if (!current.attemptStartedAt) {
    const attemptStartedAt = Date.now();
    const next = await updatePrivate(recordPath, { ...current, attemptStartedAt }, etag);
    if (!next) throw new Error("Screening email state changed");
    current = { ...current, attemptStartedAt };
    etag = next;
  } else if (
    Date.now() - current.attemptStartedAt > 23 * 60 * 60 * 1000 &&
    (!current.ownerEmailId || !current.applicantEmailId)
  ) {
    throw new Error("Screening delivery needs manual owner attention");
  }
  if (!current.ownerEmailId) {
    const id = await send("owner");
    const next = await updatePrivate(recordPath, { ...current, ownerEmailId: id }, etag);
    if (!next) throw new Error("Screening email state changed");
    current = { ...current, ownerEmailId: id };
    etag = next;
  }
  if (!current.applicantEmailId) {
    const id = await send("applicant");
    const next = await updatePrivate(recordPath, { ...current, applicantEmailId: id }, etag);
    if (!next) throw new Error("Screening email state changed");
    current = { ...current, applicantEmailId: id };
  }
  return current;
}
