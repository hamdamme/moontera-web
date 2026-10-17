
import { randomBytes } from "node:crypto";
import { Resend } from "resend";
import {
  createPrivate,
  deletePrivate,
  readPrivate,
  updatePrivate,
} from "./private-store";
import { findQuickRecord } from "./records";
import { hashSecret } from "./admin-auth";
import { applicationBaseUrl } from "./urls";

export type InvitationPurpose = "screening" | "full";
export type InvitationRecord = {
  tokenHash: string;
  purpose: InvitationPurpose;
  quickId: string;
  quickPath: string;
  email: string;
  issuedAt: number;
  expiresAt: number;
  revokedAt?: number;
};
type ActiveInvitation = { tokenHash: string; issuedAt: number };
const INVITE_TTL = 14 * 24 * 60 * 60 * 1000;
const ACTIVE_PREFIX = "onboarding/active-invitations/";
const INVITE_PREFIX = "onboarding/invitations/";

function activeKey(purpose: InvitationPurpose, quickId: string) {
  return `${ACTIVE_PREFIX}${purpose}/${quickId}.json`;
}

export async function issueInvitation(
  quickId: string,
  purpose: InvitationPurpose,
) {
  if (!process.env.BLOB_READ_WRITE_TOKEN || !process.env.RESEND_API_KEY)
    throw new Error("Invitation delivery is not configured");
  const located = await findQuickRecord(quickId);
  if (!located || !located.record.complete)
    throw new Error("Completed Quick Application was not found");
  if (
    !located.pathname.startsWith("applications/quick/") ||
    !located.pathname.endsWith(".json")
  )
    throw new Error("Invalid application record reference");
  if (purpose === "full" && !(await hasSignedScreening(quickId)))
    throw new Error("A signed Screening record is required before inviting this driver to the Full Application");

  const now = Date.now();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSecret(token);
  const record: InvitationRecord = {
    tokenHash,
    purpose,
    quickId,
    quickPath: located.pathname,
    email: located.record.payload.email,
    issuedAt: now,
    expiresAt: now + INVITE_TTL,
  };
  const invitePath = `${INVITE_PREFIX}${tokenHash}.json`;
  if (!(await createPrivate(invitePath, record)))
    throw new Error("Could not create invitation");

  const pointerPath = activeKey(purpose, quickId);
  const previous = await readPrivate<ActiveInvitation>(pointerPath);
  const pointer = { tokenHash, issuedAt: now };
  const savedPointer = previous
    ? await updatePrivate(pointerPath, pointer, previous.etag)
    : await createPrivate(pointerPath, pointer);
  if (!savedPointer) {
    await deletePrivate(invitePath);
    throw new Error("Another invitation was created at the same time. Try again.");
  }
  if (previous) {
    const oldPath = `${INVITE_PREFIX}${previous.value.tokenHash}.json`;
    const oldInvite = await readPrivate<InvitationRecord>(oldPath);
    if (oldInvite)
      await updatePrivate(
        oldPath,
        { ...oldInvite.value, revokedAt: now },
        oldInvite.etag,
      );
  }

  const appBase = applicationBaseUrl();
  const pathname = purpose === "screening" ? "/driver-screening" : "/apply";
  const title = purpose === "screening" ? "Driver Screening Consents" : "Full Driver Application";
  const href = `${appBase}${pathname}#token=${token}`;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.APPLICATION_FROM || "Moontera LLC <info@moonterallc.com>";
  const { data, error } = await resend.emails.send(
    {
      from,
      to: [record.email],
      replyTo: "info@moonterallc.com",
      subject: `Moontera LLC - secure ${title} invitation`,
      text: `Hello ${located.record.payload.name},\n\nMoontera LLC invites you to complete the ${title}. This secure link expires in 14 days and can only be used for the intended application.\n\n${href}\n\nIf you have questions, reply to this email or contact info@moonterallc.com.\n\nMoontera LLC`,
      html: `<p>Hello ${escapeHtml(located.record.payload.name)},</p><p>Moontera LLC invites you to complete the ${escapeHtml(title)}. This secure link expires in 14 days and can only be used for the intended application.</p><p><a href="${href}">Continue securely</a></p><p>If you have questions, contact <a href="mailto:info@moonterallc.com">info@moonterallc.com</a>.</p><p>Moontera LLC</p>`,
    },
    { idempotencyKey: `driver-invitation/${tokenHash}` },
  );
  if (error || !data?.id)
    throw new Error("Invitation is saved but its email was not accepted. Issue a replacement invitation.");
  return { purpose, email: record.email, issuedAt: now, expiresAt: record.expiresAt };
}

export async function readActiveInvitation(
  token: string,
  purpose: InvitationPurpose,
) {
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return null;
  return readActiveInvitationHash(hashSecret(token), purpose);
}

export async function readActiveInvitationHash(
  tokenHash: string,
  purpose: InvitationPurpose,
) {
  if (!/^[a-f0-9]{64}$/.test(tokenHash)) return null;
  const stored = await readPrivate<InvitationRecord>(`${INVITE_PREFIX}${tokenHash}.json`);
  if (!stored) return null;
  const invitation = stored.value;
  if (
    invitation.tokenHash !== tokenHash ||
    invitation.purpose !== purpose ||
    invitation.revokedAt ||
    invitation.expiresAt <= Date.now()
  )
    return null;
  const active = await readPrivate<ActiveInvitation>(activeKey(purpose, invitation.quickId));
  if (active?.value.tokenHash !== tokenHash) return null;
  if (
    !invitation.quickPath.startsWith("applications/quick/") ||
    !invitation.quickPath.endsWith(".json")
  )
    return null;
  const application = await readPrivate<{ id?: string; deletedAt?: string }>(invitation.quickPath);
  if (!application || application.value.id !== invitation.quickId || application.value.deletedAt)
    return null;
  return invitation;
}

export async function activeInvitationStatus(quickId: string, purpose: InvitationPurpose) {
  const active = await readPrivate<ActiveInvitation>(activeKey(purpose, quickId));
  if (!active) return null;
  const invitation = await readPrivate<InvitationRecord>(`${INVITE_PREFIX}${active.value.tokenHash}.json`);
  if (!invitation || invitation.value.revokedAt || invitation.value.expiresAt <= Date.now()) return null;
  return { issuedAt: invitation.value.issuedAt, expiresAt: invitation.value.expiresAt };
}

export async function revokeInvitation(quickId: string, purpose: InvitationPurpose) {
  const pointerPath = activeKey(purpose, quickId);
  const active = await readPrivate<ActiveInvitation>(pointerPath);
  if (!active) return false;
  await deletePrivate(pointerPath);
  const invitePath = `${INVITE_PREFIX}${active.value.tokenHash}.json`;
  const invitation = await readPrivate<InvitationRecord>(invitePath);
  if (invitation && !invitation.value.revokedAt)
    await updatePrivate(invitePath, { ...invitation.value, revokedAt: Date.now() }, invitation.etag);
  return true;
}

async function hasSignedScreening(quickId: string) {
  const screening = await readPrivate<{ quickId: string; signedAt?: string; status?: string }>(
    `onboarding/screening/${quickId}.json`,
  );
  return screening?.value.quickId === quickId && !!screening.value.signedAt;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
      character
    ] as string,
  );
}
