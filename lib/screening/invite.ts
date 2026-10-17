import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export type ScreeningInvite = { email: string; nonce: string; expires: number };

function secret(): string {
  const value = process.env.APPLICATION_KEY_SECRET;
  if (!value) throw Error("Screening invitation signing is not configured.");
  return value;
}
function signature(encoded: string) {
  return createHmac("sha256", secret()).update("driver-screening/v1/" + encoded).digest("hex");
}
export function createInvite(email: string): string {
  const data: ScreeningInvite = {
    email: email.trim().toLowerCase(),
    nonce: randomUUID(),
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64url");
  return encoded + "." + signature(encoded);
}
export function verifyInvite(token: string): ScreeningInvite | null {
  if (!token || token.length > 900 || !/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/.test(token)) return null;
  const [encoded, mac] = token.split(".");
  const expected = Buffer.from(signature(encoded), "hex");
  if (!timingSafeEqual(expected, Buffer.from(mac, "hex"))) return null;
  try {
    const value = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as ScreeningInvite;
    if (!value || typeof value.email !== "string" || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value.email) ||
      typeof value.nonce !== "string" || !/^[a-f0-9-]{36}$/i.test(value.nonce) ||
      typeof value.expires !== "number" || value.expires <= Date.now() ||
      value.expires > Date.now() + 8 * 24 * 60 * 60 * 1000) return null;
    return value;
  } catch { return null; }
}
export function recordKey(nonce: string): string {
  const digest = createHmac("sha256", secret()).update("driver-screening/record/" + nonce).digest("hex");
  return "driver-screening/" + digest + ".json";
}

export function publicScreeningKey(email: string): string {
  return "driver-screening/public/" + createHmac("sha256", secret())
    .update("driver-screening/public/v1/" + email.trim().toLowerCase()).digest("hex") + ".json";
}
