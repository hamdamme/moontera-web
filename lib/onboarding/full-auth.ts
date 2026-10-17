import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import {
  createPrivate,
  deletePrivate,
  readPrivate,
  updatePrivate,
} from "./private-store";
import { hashSecret } from "./admin-auth";
import {
  readActiveInvitation,
  readActiveInvitationHash,
} from "./invitations";

const OTP_PREFIX = "onboarding/full-otp/";
const SESSION_PREFIX = "onboarding/full-sessions/";
const OTP_TTL = 10 * 60 * 1000;
const OTP_RESEND_WAIT = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const SESSION_TTL = 2 * 60 * 60 * 1000;
const COOKIE = "moontera_full";

type OtpRecord = {
  inviteHash: string;
  codeHash: string;
  requestedAt: number;
  expiresAt: number;
  attempts: number;
  verifiedAt?: number;
};
type FullSession = {
  inviteHash: string;
  email: string;
  createdAt: number;
  expiresAt: number;
};

export const fullCookieName = COOKIE;
export const fullSessionCookie = (token: string, secure: boolean) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL / 1000}${secure ? "; Secure" : ""}`;
export const clearFullCookie = (secure: boolean) =>
  `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;

function getCookie(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  return token && /^[A-Za-z0-9_-]{40,64}$/.test(token) ? token : null;
}

function digestCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return "your verified email";
  return `${name.slice(0, 1)}${"*".repeat(Math.min(6, Math.max(2, name.length - 1)))}@${domain}`;
}

export async function requestFullEmailCode(token: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN || !process.env.RESEND_API_KEY)
    throw new Error("Email verification is unavailable");
  const invitation = await readActiveInvitation(token, "full");
  if (!invitation) return null;
  const tokenHash = invitation.tokenHash;
  const key = `${OTP_PREFIX}${tokenHash}.json`;
  const prior = await readPrivate<OtpRecord>(key);
  const now = Date.now();
  if (prior && now - prior.value.requestedAt < OTP_RESEND_WAIT)
    return { maskedEmail: maskEmail(invitation.email), sent: false };

  const code = String(randomInt(100000, 1000000));
  const record: OtpRecord = {
    inviteHash: tokenHash,
    codeHash: digestCode(code),
    requestedAt: now,
    expiresAt: now + OTP_TTL,
    attempts: 0,
  };
  const stored = prior
    ? await updatePrivate(key, record, prior.etag)
    : await createPrivate(key, record);
  if (!stored) return { maskedEmail: maskEmail(invitation.email), sent: false };

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.APPLICATION_FROM || "Moontera LLC <info@moonterallc.com>";
  const { data, error } = await resend.emails.send(
    {
      from,
      to: [invitation.email],
      subject: "Your Moontera Full Application verification code",
      text: `Your one-time verification code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
    },
    { idempotencyKey: `full-otp/${tokenHash}/${Math.floor(now / OTP_RESEND_WAIT)}` },
  );
  if (error || !data?.id) {
    const savedOtp = await readPrivate<OtpRecord>(key);
    if (savedOtp?.value.codeHash === record.codeHash)
      await deletePrivate(key);
    throw new Error("Verification email could not be sent");
  }
  return { maskedEmail: maskEmail(invitation.email), sent: true };
}

export async function verifyFullEmailCode(token: string, code: string) {
  if (!/^\d{6}$/.test(code)) return null;
  const invitation = await readActiveInvitation(token, "full");
  if (!invitation) return null;
  const key = `${OTP_PREFIX}${invitation.tokenHash}.json`;
  const otp = await readPrivate<OtpRecord>(key);
  const now = Date.now();
  if (
    !otp ||
    otp.value.inviteHash !== invitation.tokenHash ||
    otp.value.expiresAt <= now ||
    otp.value.verifiedAt ||
    otp.value.attempts >= OTP_MAX_ATTEMPTS
  )
    return null;
  const incremented = await updatePrivate(
    key,
    { ...otp.value, attempts: otp.value.attempts + 1 },
    otp.etag,
  );
  if (!incremented) return null;
  const suppliedHash = Buffer.from(digestCode(code), "hex");
  const expectedHash = Buffer.from(otp.value.codeHash, "hex");
  if (
    suppliedHash.length !== expectedHash.length ||
    !timingSafeEqual(suppliedHash, expectedHash)
  )
    return null;
  const latest = await readPrivate<OtpRecord>(key);
  if (
    !latest ||
    latest.value.verifiedAt ||
    !(await updatePrivate(key, { ...latest.value, verifiedAt: now }, latest.etag))
  )
    return null;

  const sessionToken = randomBytes(32).toString("base64url");
  const expiresAt = Math.min(now + SESSION_TTL, invitation.expiresAt);
  const saved = await createPrivate<FullSession>(
    `${SESSION_PREFIX}${hashSecret(sessionToken)}.json`,
    { inviteHash: invitation.tokenHash, email: invitation.email, createdAt: now, expiresAt },
  );
  if (!saved) return null;
  return { sessionToken, email: invitation.email, quickId: invitation.quickId, expiresAt };
}

export async function getFullApplicantSession(request: Request) {
  const token = getCookie(request);
  if (!token || !process.env.BLOB_READ_WRITE_TOKEN) return null;
  const session = await readPrivate<FullSession>(
    `${SESSION_PREFIX}${hashSecret(token)}.json`,
  );
  if (!session || session.value.expiresAt <= Date.now()) return null;
  const invitation = await readActiveInvitationHash(session.value.inviteHash, "full");
  if (!invitation || invitation.email !== session.value.email) return null;
  return { ...invitation, email: session.value.email, sessionExpiresAt: session.value.expiresAt };
}

export async function revokeFullApplicantSession(request: Request) {
  const token = getCookie(request);
  if (!token) return;
  await deletePrivate(`${SESSION_PREFIX}${hashSecret(token)}.json`);
}
