
import { Resend } from "resend";
import { readPrivate, updatePrivate } from "@/lib/onboarding/private-store";
import type { PolicyConsentRecord } from "@/lib/onboarding/policy-consents";

export class PolicyDeliveryError extends Error {
  constructor(readonly stage: "moontera" | "applicant" | "storage", cause?: unknown) {
    super(`Policy delivery failed at ${stage}${cause instanceof Error ? `: ${cause.message.slice(0, 180)}` : ""}`);
    this.name = "PolicyDeliveryError";
  }
}

export async function deliverPolicyConsent(recordPath: string) {
  if (!process.env.RESEND_API_KEY) throw new PolicyDeliveryError("storage");
  const stored = await readPrivate<PolicyConsentRecord>(recordPath);
  if (!stored) throw new PolicyDeliveryError("storage");
  let current = stored.value;
  let etag = stored.etag;
  if (!current.attemptStartedAt) {
    const attemptStartedAt = Date.now();
    const next = await updatePrivate(recordPath, { ...current, attemptStartedAt }, etag);
    if (!next) throw new PolicyDeliveryError("storage");
    current = { ...current, attemptStartedAt };
    etag = next;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.APPLICATION_FROM || "Moontera LLC <info@moonterallc.com>";
  for (const recipient of ["owner", "applicant"] as const) {
    const key = recipient === "owner" ? "ownerEmailId" : "applicantEmailId";
    if (current[key]) continue;
    const to = recipient === "owner" ? "llcmoontera@gmail.com" : current.email;
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      replyTo: recipient === "owner" ? current.email : "info@moonterallc.com",
      subject: recipient === "owner"
        ? `Driver policies signed - ${current.name}`
        : "Your signed Moontera driver policies",
      text: recipient === "owner"
        ? `${current.name} completed the Moontera driver policies. The signed policy packet is attached.\n\nDriver email: ${current.email}\nSigned: ${current.submittedAt}\nReference: ${current.id}`
        : `Hello ${current.name},\n\nAttached is the exact PDF copy of the three Moontera driver policies you reviewed and signed on ${current.submittedAt}. Keep it for your records.\n\nReference: ${current.id}\n\nQuestions? Contact info@moonterallc.com or 773-882-5595.\n\nMoontera LLC`,
      attachments: [{
        filename: `Moontera-Signed-Driver-Policies-${current.id.slice(0, 8)}.pdf`,
        content: current.pdf,
      }],
    }, { idempotencyKey: `policy-consent/${current.id}/${recipient}` });
    if (error || !data?.id)
      throw new PolicyDeliveryError(recipient === "owner" ? "moontera" : "applicant", error || undefined);
    const next = await updatePrivate(recordPath, { ...current, [key]: data.id }, etag);
    if (!next) throw new PolicyDeliveryError("storage");
    current = { ...current, [key]: data.id };
    etag = next;
  }
  return current;
}
