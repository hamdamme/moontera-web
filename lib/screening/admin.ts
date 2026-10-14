import { createHash, timingSafeEqual } from "node:crypto";

const json = (message: string, status: number) =>
  Response.json({ message }, { status, headers: { "Cache-Control": "no-store" } });

export function authorizeScreeningAdmin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (origin && !["https://www.moonterallc.com", "https://moonterallc.com", new URL(request.url).origin].includes(origin))
    return json("Invalid request origin.", 403);
  const configured = process.env.SCREENING_ADMIN_KEY;
  if (!configured || configured.length < 20 || !process.env.APPLICATION_KEY_SECRET || !process.env.BLOB_READ_WRITE_TOKEN)
    return json("Screening administration is not configured.", 503);
  const entered = request.headers.get("x-screening-admin-key") || "";
  if (entered.length > 500) return json("Not authorized.", 401);
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(digest(entered), digest(configured))) return json("Incorrect admin password.", 401);
  return null;
}

export function validateScreeningEmail(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 254) return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : null;
}

export async function readAdminBody(request: Request): Promise<Record<string, unknown> | null> {
  if (!request.headers.get("content-type")?.includes("application/json")) return null;
  if (Number(request.headers.get("content-length")) > 3000) return null;
  let count = 0;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    count += part.value.length;
    if (count > 3000) { await reader.cancel(); return null; }
    chunks.push(part.value);
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown> : null;
  } catch { return null; }
}
