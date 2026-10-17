import { list } from "@vercel/blob";
import { deletePrivate, readPrivate } from "@/lib/onboarding/private-store";

export const runtime = "nodejs";
export const maxDuration = 60;

type TimedRecord = { expiresAt?: number; retentionEndsAt?: number; revokedAt?: number; usedAt?: number };

async function purgeExpiredPrefix(prefix: string, field: "expiresAt" | "retentionEndsAt", now: number) {
  let cursor: string | undefined;
  let deleted = 0;
  for (let page = 0; page < 100; page++) {
    const batch = await list({ prefix, limit: 1000, ...(cursor ? { cursor } : {}) });
    for (const blob of batch.blobs) {
      if (!blob.pathname.endsWith(".json")) continue;
      const record = await readPrivate<TimedRecord>(blob.pathname);
      if (!record) continue;
      const expired = typeof record.value[field] === "number" && record.value[field]! <= now;
      const revokedInvitation = field === "expiresAt" && !!record.value.revokedAt && blob.pathname.startsWith("onboarding/invitations/");
      const usedMagicLink = !!record.value.usedAt && blob.pathname.startsWith("onboarding/admin/magic/");
      if (expired || revokedInvitation || usedMagicLink) {
        await deletePrivate(blob.pathname);
        deleted++;
      }
    }
    if (!batch.hasMore) return { deleted, complete: true };
    cursor = batch.cursor;
    if (page === 99) return { deleted, complete: false };
  }
  return { deleted, complete: false };
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN)
    return Response.json({ message: "Private storage is unavailable." }, { status: 503 });

  try {
    const now = Date.now();
    const jobs = [
      purgeExpiredPrefix("onboarding/full-drafts/", "retentionEndsAt", now),
      purgeExpiredPrefix("onboarding/full-otp/", "expiresAt", now),
      purgeExpiredPrefix("onboarding/full-sessions/", "expiresAt", now),
      purgeExpiredPrefix("onboarding/admin/magic/", "expiresAt", now),
      purgeExpiredPrefix("onboarding/admin/sessions/", "expiresAt", now),
      purgeExpiredPrefix("onboarding/invitations/", "expiresAt", now),
      purgeExpiredPrefix("onboarding/application-rate-limits/", "expiresAt", now),
    ];
    const results = await Promise.all(jobs);
    const deleted = results.reduce((sum, result) => sum + result.deleted, 0);
    const complete = results.every((result) => result.complete);
    return Response.json(
      complete ? { deleted } : { deleted, message: "Some records remain; cleanup will continue on its next scheduled run." },
      { status: complete ? 200 : 206, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ message: "Draft cleanup failed." }, { status: 503 });
  }
}
