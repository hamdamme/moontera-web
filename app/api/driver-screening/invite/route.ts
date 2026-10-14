import { createHash, timingSafeEqual } from "node:crypto";
import { createInvite } from "@/lib/screening/invite";

export const runtime = "nodejs";
const reply = (data: unknown, status = 200) => Response.json(data, {
  status, headers: { "Cache-Control": "no-store" },
});
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && !["https://www.moonterallc.com", "https://moonterallc.com", new URL(request.url).origin].includes(origin))
    return reply({ message: "Invalid request origin." }, 403);
  if (!request.headers.get("content-type")?.includes("application/json"))
    return reply({ message: "Invalid content type." }, 415);
  const configured = process.env.SCREENING_ADMIN_KEY;
  if (!configured || configured.length < 20 || !process.env.APPLICATION_KEY_SECRET)
    return reply({ message: "Invitation management is not configured. Contact the site administrator." }, 503);
  const presented = request.headers.get("x-screening-admin-key") || "";
  if (presented.length > 500) return reply({ message: "Not authorized." }, 401);
  const hash = (text: string) => createHash("sha256").update(text).digest();
  if (!timingSafeEqual(hash(configured), hash(presented)))
    return reply({ message: "Not authorized." }, 401);
  try {
    if (Number(request.headers.get("content-length")) > 2000) return reply({ message: "Request too large." }, 413);
    const { email } = await request.json() as { email?: unknown };
    if (typeof email !== "string" || email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email.trim()))
      return reply({ message: "Enter a valid driver email." }, 400);
    const token = createInvite(email);
    return reply({ url: "https://www.moonterallc.com/driver-screening?invite=" + encodeURIComponent(token),
      expiresInDays: 7 });
  } catch {
    return reply({ message: "Unable to create an invitation." }, 400);
  }
}
