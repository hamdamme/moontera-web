
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createSignedPolicyPacketPdf } from "@/lib/applications/policies-pdf";
import { deliverPolicyConsent, PolicyDeliveryError } from "@/lib/applications/policy-delivery";
import { createPrivate, readPrivate } from "@/lib/onboarding/private-store";
import { policyConsentPath, resolvePolicyInvitation, type PolicyConsentRecord } from "@/lib/onboarding/policy-consents";
import { validAdminOrigin } from "@/lib/onboarding/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
function clean(value: unknown, max: number) {
  return typeof value === "string" && value.length <= max && !/[\x00-\x1f]/.test(value) ? value.trim() : "";
}
function validUuid(value: string) {
  return /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
}
async function loadInvite(url: URL, token: string) {
  const quickId = clean(url.searchParams.get("quickId"), 36);
  const fullId = clean(url.searchParams.get("fullId"), 36);
  token = clean(token, 64);
  if (!validUuid(quickId) || !validUuid(fullId) || !/^[a-f0-9]{64}$/.test(token)) return null;
  const resolved = await resolvePolicyInvitation(fullId, quickId, token);
  if (!resolved) return null;
  return { ...resolved, quickId, fullId };
}

export async function GET(request: Request) {
  try {
    const resolved = await loadInvite(new URL(request.url), request.headers.get("x-policy-token") || "");
    if (!resolved) return reply({ success: false, message: "This secure policy link is invalid or expired. Contact info@moonterallc.com for a new link." }, 401);
    const existing = await readPrivate<PolicyConsentRecord>(policyConsentPath(resolved.quickId, resolved.fullId));
    return reply({
      success: true,
      name: resolved.full.payload.name,
      email: resolved.invitation.email,
      completed: !!(existing?.value.ownerEmailId && existing?.value.applicantEmailId),
      deliveryPending: !!existing && !(existing.value.ownerEmailId && existing.value.applicantEmailId),
      signedAt: existing?.value.submittedAt,
    });
  } catch (error) {
    console.error("Policy invitation lookup failed", error instanceof Error ? error.name : "Unknown error");
    return reply({ success: false, message: "The policy packet could not be loaded. Please retry or contact info@moonterallc.com." }, 503);
  }
}

export async function POST(request: Request) {
  if (!validAdminOrigin(request)) return reply({ success: false, message: "Invalid request origin." }, 403);
  if (!process.env.BLOB_READ_WRITE_TOKEN || !process.env.RESEND_API_KEY || !process.env.APPLICATION_KEY_SECRET)
    return reply({ success: false, message: "Policy signing is temporarily unavailable. Contact info@moonterallc.com." }, 503);
  if (Number(request.headers.get("content-length")) > 20000) return reply({ success: false, message: "Submission is too large." }, 413);
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return reply({ success: false, message: "Invalid policy acknowledgment." }, 400); }
  const quickId = clean(body.quickId, 36);
  const fullId = clean(body.fullId, 36);
  const token = clean(body.token, 64);
  const requestId = clean(body.requestId, 36);
  const name = clean(body.name, 120).replace(/\s+/g, " ");
  const mode = clean(body.mode, 8);
  const signatureImage = clean(body.signatureImage, 120000);
  const acknowledgements = body.acknowledgements as Record<string, unknown> | undefined;
  if (!validUuid(requestId) || !name || !acknowledgements || ["safety", "cargo", "accident"].some((id) => acknowledgements[id] !== true) || !["type", "draw"].includes(mode) || (mode === "draw" && !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signatureImage)))
    return reply({ success: false, message: "Review and acknowledge all three policies, then provide your typed or drawn signature." }, 400);
  try {
    const resolved = await resolvePolicyInvitation(fullId, quickId, token);
    if (!resolved) return reply({ success: false, message: "This secure policy link is invalid or expired. Contact info@moonterallc.com for a new link." }, 401);
    if (name.toLocaleLowerCase() !== resolved.full.payload.name.trim().replace(/\s+/g, " ").toLocaleLowerCase())
      return reply({ success: false, message: "Enter your full legal name as it appears on your application." }, 400);
    const recordPath = policyConsentPath(quickId, fullId);
    let stored = await readPrivate<PolicyConsentRecord>(recordPath);
    if (!stored) {
      const submittedAt = new Date().toISOString();
      const id = randomUUID();
      const font = await readFile(path.join(process.cwd(), "public/fonts/Geist-Regular.ttf"));
      const pdf = await createSignedPolicyPacketPdf(font, {
        name,
        email: resolved.invitation.email,
        signedAt: submittedAt,
        reference: id,
        ...(mode === "draw" ? { signatureImage } : {}),
      });
      const record: PolicyConsentRecord = {
        id, fullId, quickId, email: resolved.invitation.email, name, submittedAt,
        acknowledgements: { safety: true, cargo: true, accident: true },
        pdf: Buffer.from(pdf).toString("base64"),
      };
      const etag = await createPrivate(recordPath, record);
      stored = etag ? { value: record, etag } : await readPrivate<PolicyConsentRecord>(recordPath);
      if (!stored) return reply({ success: false, message: "Your signed policies could not be saved. Please retry." }, 503);
    }
    const delivered = await deliverPolicyConsent(recordPath);
    return reply({ success: true, name: delivered.name, signedAt: delivered.submittedAt, alreadySubmitted: !!stored.value.ownerEmailId && !!stored.value.applicantEmailId });
  } catch (error) {
    if (error instanceof PolicyDeliveryError) {
      console.error("Policy email delivery failed", error.stage, error.message.slice(0, 220));
      const message = error.stage === "moontera"
        ? "Your signed policies are saved, but Moontera could not receive the email yet. Tap Retry; your answers are saved."
        : error.stage === "applicant"
          ? "Your signed policies are saved, but the copy email could not be confirmed. Tap Retry to finish delivery."
          : "Your signed policies are saved. Email delivery is being retried; please try again shortly.";
      return reply({ success: false, message, saved: true }, 503);
    }
    console.error("Policy submission failed", error instanceof Error ? error.name : "Unknown error");
    return reply({ success: false, message: "Your signing could not be completed. Please retry or contact info@moonterallc.com." }, 503);
  }
}
