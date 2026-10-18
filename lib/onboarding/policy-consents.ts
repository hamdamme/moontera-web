
import { createHmac, timingSafeEqual } from "node:crypto";
import { createPrivate, readPrivate, updatePrivate } from "./private-store";
import type { RecordData } from "@/lib/applications/workflow";

export type PolicyInvitation = {
  fullId: string;
  quickId: string;
  email: string;
  issuedAt: number;
  expiresAt: number;
};

export type PolicyConsentRecord = {
  id: string;
  fullId: string;
  quickId: string;
  email: string;
  name: string;
  submittedAt: string;
  acknowledgements: Record<"safety" | "cargo" | "accident", true>;
  pdf: string;
  ownerEmailId?: string;
  applicantEmailId?: string;
  attemptStartedAt?: number;
};

const TTL = 14 * 24 * 60 * 60 * 1000;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export function validPolicyId(value: string) { return uuid.test(value); }
export function policyInvitePath(fullId: string) { return `onboarding/policy-invitations/${fullId}.json`; }
export function policyConsentPath(quickId: string, fullId: string) { return `onboarding/policy-consents/${quickId}/${fullId}.json`; }

function tokenFor(fullId: string, quickId: string, email: string) {
  const secret = process.env.APPLICATION_KEY_SECRET;
  if (!secret) throw new Error("Policy invitation signing is not configured");
  return createHmac("sha256", secret).update(`moontera-policy-v1:${fullId}:${quickId}:${email}`).digest("hex");
}

export async function ensurePolicyInvitation(fullId: string, quickId: string, email: string) {
  const key = policyInvitePath(fullId);
  const current = await readPrivate<PolicyInvitation>(key);
  if (current && current.value.quickId === quickId && current.value.email === email && current.value.expiresAt > Date.now())
    return tokenFor(fullId, quickId, email);
  const now = Date.now();
  const invite = { fullId, quickId, email, issuedAt: now, expiresAt: now + TTL };
  const saved = current
    ? await updatePrivate(key, invite, current.etag)
    : await createPrivate(key, invite);
  if (!saved) {
    const raced = await readPrivate<PolicyInvitation>(key);
    if (!raced || raced.value.quickId !== quickId || raced.value.email !== email || raced.value.expiresAt <= Date.now())
      throw new Error("Could not prepare the policy invitation");
  }
  return tokenFor(fullId, quickId, email);
}

export async function resolvePolicyInvitation(fullId: string, quickId: string, token: string) {
  if (!validPolicyId(fullId) || !validPolicyId(quickId) || !/^[a-f0-9]{64}$/.test(token)) return null;
  const stored = await readPrivate<PolicyInvitation>(policyInvitePath(fullId));
  if (!stored || stored.value.quickId !== quickId || stored.value.expiresAt <= Date.now()) return null;
  const expected = Buffer.from(tokenFor(fullId, quickId, stored.value.email), "hex");
  const candidate = Buffer.from(token, "hex");
  if (expected.length !== candidate.length || !timingSafeEqual(expected, candidate)) return null;
  const emailHash = createHmac("sha256", process.env.APPLICATION_KEY_SECRET!).update(stored.value.email).digest("hex");
  const full = await readPrivate<RecordData>(`applications/full/${emailHash}.json`);
  if (!full || full.value.id !== fullId || full.value.deletedAt || !full.value.complete || full.value.payload.email !== stored.value.email || full.value.sourceQuickId !== quickId)
    return null;
  return { invitation: stored.value, full: full.value };
}
