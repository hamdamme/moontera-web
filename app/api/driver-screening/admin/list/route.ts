import { get, list } from "@vercel/blob";
import { authorizeScreeningAdmin, readAdminBody } from "@/lib/screening/admin";
import type { ScreeningRecord } from "@/lib/screening/pdf";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const blocked = authorizeScreeningAdmin(request);
  if (blocked) return blocked;
  const body = await readAdminBody(request);
  if (!body || (body.cursor !== undefined && (typeof body.cursor !== "string" || body.cursor.length > 1000)))
    return Response.json({ message: "Invalid request." }, { status: 400 });
  try {
    const result = await list({
      prefix: "driver-screening/public/",
      limit: 40,
      cursor: typeof body.cursor === "string" && body.cursor ? body.cursor : undefined
    });
    const responses = await Promise.all(result.blobs.map(async (blob) => {
      const item = await get(blob.pathname, { access: "private" });
      if (!item?.stream) return null;
      const record = JSON.parse(await new Response(item.stream).text()) as ScreeningRecord;
      if (!record.id || !record.driver?.email || !record.driver?.name) return null;
      return {
        id: record.id,
        createdAt: record.createdAt,
        name: record.driver.name,
        email: record.driver.email,
        testDate: record.driver.testDate || "",
        mvrSignature: record.consents?.mvr?.signedBy || "",
        pspSignature: record.consents?.psp?.signedBy || "",
        certification: record.certification?.signedBy || ""
      };
    }));
    return Response.json({
      submissions: responses.filter((x) => x !== null).sort((a,b) => b!.createdAt.localeCompare(a!.createdAt)),
      cursor: result.hasMore ? result.cursor : null
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Failed to list private screening records");
    return Response.json({ message: "Unable to load driver responses. Please retry." }, { status: 503 });
  }
}
