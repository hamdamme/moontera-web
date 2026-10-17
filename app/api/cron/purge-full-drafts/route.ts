import { list } from "@vercel/blob";
import { deletePrivate, readPrivate } from "@/lib/onboarding/private-store";

export const runtime = "nodejs";
export const maxDuration = 60;

type FullDraft = { retentionEndsAt?: number };

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN)
    return Response.json({ message: "Private storage is unavailable." }, { status: 503 });

  try {
    let cursor: string | undefined;
    let deleted = 0;
    for (let page = 0; page < 100; page++) {
      const batch = await list({
        prefix: "onboarding/full-drafts/",
        limit: 1000,
        ...(cursor ? { cursor } : {}),
      });
      for (const blob of batch.blobs) {
        if (!blob.pathname.endsWith(".json")) continue;
        const draft = await readPrivate<FullDraft>(blob.pathname);
        // Malformed or legacy records are preserved for manual review.
        if (typeof draft?.value.retentionEndsAt === "number" && draft.value.retentionEndsAt <= Date.now()) {
          await deletePrivate(blob.pathname);
          deleted++;
        }
      }
      if (!batch.hasMore) break;
      cursor = batch.cursor;
      if (page === 99)
        return Response.json({ deleted, message: "More records remain; run the cleanup again." }, { status: 206 });
    }
    return Response.json({ deleted }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Draft cleanup failed." }, { status: 503 });
  }
}
