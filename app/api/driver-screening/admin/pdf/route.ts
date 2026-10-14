import { get } from "@vercel/blob";
import { authorizeScreeningAdmin, readAdminBody, validateScreeningEmail } from "@/lib/screening/admin";
import { publicScreeningKey } from "@/lib/screening/invite";
import { createScreeningPdf, type ScreeningRecord } from "@/lib/screening/pdf";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const blocked = authorizeScreeningAdmin(request);
  if (blocked) return blocked;
  const body = await readAdminBody(request);
  const email = validateScreeningEmail(body?.email);
  if (!email) return Response.json({ message: "Invalid driver email." }, { status: 400 });
  try {
    const stored = await get(publicScreeningKey(email), { access: "private" });
    if (!stored?.stream) return Response.json({ message: "Screening not found." }, { status: 404 });
    const record = JSON.parse(await new Response(stored.stream).text()) as ScreeningRecord;
    if (record.driver?.email !== email) return Response.json({ message: "Record mismatch." }, { status: 503 });
    const pdf = await createScreeningPdf(record);
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="moontera-driver-screening-' + record.id + '.pdf"',
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    console.error("Screening PDF download failed");
    return Response.json({ message: "Unable to download the screening PDF." }, { status: 503 });
  }
}
