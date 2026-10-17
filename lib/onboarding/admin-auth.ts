import { createHash, randomBytes } from "node:crypto";
import { Resend } from "resend";
import {
  createPrivate,
  deletePrivate,
  readPrivate,
  updatePrivate,
} from "./private-store";
import { applicationBaseUrl } from "./urls";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "llcmoontera@gmail.com").toLowerCase();
const COOKIE = "moontera_admin";
const MAGIC_TTL = 15 * 60 * 1000;
const SESSION_TTL = 8 * 60 * 60 * 1000;
const MAGIC_PREFIX = "onboarding/admin/magic/";
const SESSION_PREFIX = "onboarding/admin/sessions/";

type MagicRecord = {
  email: string;
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
};
type SessionRecord = { email: string; createdAt: number; expiresAt: number };
type CooldownRecord = { sentAt: number };

export const adminCookieName = COOKIE;
export const adminCookieTtl = SESSION_TTL / 1000;
export const adminCookieOptions = (secure: boolean) =>
  `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;
export const adminSessionCookie = (token: string, secure: boolean) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${adminCookieTtl}${secure ? "; Secure" : ""}`;

export function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function validAdminOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}

function readCookie(request: Request) {
  const value = request.headers
    .get("cookie")
    ?.split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  return value && /^[A-Za-z0-9_-]{40,64}$/.test(value) ? value : null;
}

async function acquireEmailCooldown(now: number) {
  const key = "onboarding/admin/magic-cooldown.json";
  const current = await readPrivate<CooldownRecord>(key);
  if (!current)
    return (await createPrivate(key, { sentAt: now })) !== null;
  if (now - current.value.sentAt < 60_000) return false;
  return (await updatePrivate(key, { sentAt: now }, current.etag)) !== null;
}

export async function requestAdminMagicLink(email: string) {
  if (email.toLowerCase() !== ADMIN_EMAIL) return;
  if (!process.env.BLOB_READ_WRITE_TOKEN || !process.env.RESEND_API_KEY) return;
  const now = Date.now();
  if (!(await acquireEmailCooldown(now))) return;

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSecret(token);
  const key = `${MAGIC_PREFIX}${tokenHash}.json`;
  const saved = await createPrivate<MagicRecord>(key, {
    email: ADMIN_EMAIL,
    createdAt: now,
    expiresAt: now + MAGIC_TTL,
  });
  if (!saved) return;

  const baseUrl = applicationBaseUrl();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.APPLICATION_FROM || "Moontera LLC <info@moonterallc.com>";
  const { error, data } = await resend.emails.send(
    {
      from,
      to: [ADMIN_EMAIL],
      subject: "Your Moontera application dashboard sign-in link",
      text: `Open this secure, single-use sign-in link within 15 minutes:\n\n${baseUrl}/admin/verify#token=${token}\n\nIf you did not request this email, you can ignore it.`,
      html: `<p>Open this secure, single-use sign-in link within 15 minutes:</p><p><a href="${baseUrl}/admin/verify#token=${token}">Sign in to Moontera applications</a></p><p>If you did not request this email, you can ignore it.</p>`,
    },
    { idempotencyKey: `admin-magic/${tokenHash}` },
  );
  if (error || !data?.id) {
    await deletePrivate(key);
    throw new Error("Admin sign-in email could not be sent");
  }
}

export async function consumeAdminMagicLink(token: string) {
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return null;
  const tokenHash = hashSecret(token);
  const key = `${MAGIC_PREFIX}${tokenHash}.json`;
  const record = await readPrivate<MagicRecord>(key);
  const now = Date.now();
  if (
    !record ||
    record.value.email !== ADMIN_EMAIL ||
    record.value.usedAt ||
    record.value.expiresAt <= now
  )
    return null;
  if (
    !(await updatePrivate(
      key,
      { ...record.value, usedAt: now },
      record.etag,
    ))
  )
    return null;

  const sessionToken = randomBytes(32).toString("base64url");
  const sessionHash = hashSecret(sessionToken);
  const sessionKey = `${SESSION_PREFIX}${sessionHash}.json`;
  const saved = await createPrivate<SessionRecord>(sessionKey, {
    email: ADMIN_EMAIL,
    createdAt: now,
    expiresAt: now + SESSION_TTL,
  });
  if (!saved) return null;
  return sessionToken;
}

export async function getAdminSession(request: Request) {
  const token = readCookie(request);
  if (!token || !process.env.BLOB_READ_WRITE_TOKEN) return null;
  const record = await readPrivate<SessionRecord>(
    `${SESSION_PREFIX}${hashSecret(token)}.json`,
  );
  if (!record || record.value.email !== ADMIN_EMAIL || record.value.expiresAt <= Date.now())
    return null;
  return { email: record.value.email, expiresAt: record.value.expiresAt };
}

export async function revokeAdminSession(request: Request) {
  const token = readCookie(request);
  if (!token) return;
  await deletePrivate(`${SESSION_PREFIX}${hashSecret(token)}.json`);
}
