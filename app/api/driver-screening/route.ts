import { createHash, randomUUID } from "node:crypto";
import { put, BlobPreconditionFailedError } from "@vercel/blob";
import { Resend } from "resend";
import { publicScreeningKey } from "@/lib/screening/invite";
import documents from "@/app/apply/documents/documents.json";
import { createScreeningPdf } from "@/lib/screening/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

class Invalid extends Error {}
const respond = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
function val(data: Record<string, unknown>, key: string, max = 200, required = true): string {
  const value = data[key];
  if ((value === undefined || value === null) && !required) return "";
  if (typeof value !== "string" || value.length > max || /[\x00-\x1f]/.test(value))
    throw new Invalid("Invalid " + key + " field.");
  const cleaned = value.trim();
  if (required && !cleaned) throw new Invalid("Complete all required fields.");
  return cleaned;
}
function date(data: Record<string, unknown>, key: string, required = true): string {
  const value = val(data, key, 10, required);
  if (!value && !required) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Invalid("Enter a valid " + key + ".");
  const parsed = new Date(value + "T12:00:00Z");
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10) !== value)
    throw new Invalid("Enter a valid " + key + ".");
  return value;
}
const consentVersion = (id: string): string => {
  const doc = documents.find(x=>x.id === id);
  return createHash("sha256").update(JSON.stringify(doc?.sections || [])).digest("hex");
};
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && !["https://www.moonterallc.com", "https://moonterallc.com", new URL(request.url).origin].includes(origin))
      return respond({message:"Invalid request origin."},403);
    if (!request.headers.get("content-type")?.includes("application/json"))
      return respond({message:"Send JSON data."},415);
    if (Number(request.headers.get("content-length")) > 22000)
      return respond({message:"Request too large."},413);
    if (!process.env.BLOB_READ_WRITE_TOKEN || !process.env.APPLICATION_KEY_SECRET || !process.env.RESEND_API_KEY)
      return respond({message:"Screening submissions are not configured yet."},503);
    const chunks: Uint8Array[] = [];
    let n = 0;
    const reader = request.body?.getReader();
    if (!reader) return respond({message:"Missing form."},400);
    while(true) {
      const part = await reader.read();
      if(part.done) break;
      n += part.value.length;
      if(n > 22000) { await reader.cancel();return respond({message:"Request too large."},413); }
      chunks.push(part.value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {data?:unknown};
    if (!body.data || typeof body.data !== "object" || Array.isArray(body.data))
      throw new Invalid("Invalid form data.");
    const raw = body.data as Record<string, unknown>;
    const email = val(raw,"email",254).toLowerCase();
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new Invalid("Enter a valid email address.");
    if (raw.website) return respond({success:true,reference:"received"});
    const mvrSignature=val(raw,"mvrSignature",120),pspSignature=val(raw,"pspSignature",120),
      clearingSignature=val(raw,"clearinghouseSignature",120),certificationSignature=val(raw,"certificationSignature",120);
    const certificationDate=date(raw,"certificationDate");
    if(certificationDate>new Date().toISOString().slice(0,10)) throw new Invalid("Certification date cannot be in the future.");
    const name = certificationSignature;
    if (raw.mvrConsent !== "yes" || raw.pspConsent !== "yes" || raw.clearinghouseConsent !== "yes")
      throw new Invalid("Review and agree to the MVR and PSP authorizations.");
    if (raw.certified !== "yes") throw new Invalid("Please accept the certification.");
    const key=publicScreeningKey(email);
    const id=randomUUID(),createdAt=new Date().toISOString();
    const record={
      id,createdAt,
      driver:{email,name},
      consents:{
        mvr:{signedBy:mvrSignature,confirmed:true,version:consentVersion("mvr"),signedAt:createdAt},
        psp:{signedBy:pspSignature,confirmed:true,version:consentVersion("psp"),signedAt:createdAt},
        clearinghouse:{signedBy:clearingSignature,confirmed:true,signedAt:createdAt},
      },
      certification:{signedBy:certificationSignature,date:certificationDate,at:createdAt},
      notification:"not-guaranteed",
    };
    try{
      await put(key,JSON.stringify(record),{access:"private",addRandomSuffix:false,allowOverwrite:false,contentType:"application/json"});
    }catch(e){
      if(e instanceof BlobPreconditionFailedError || (e instanceof Error && /already exists|precondition/i.test(e.message)))
        return respond({message:"A screening form has already been received for this email. Contact Moontera LLC to make corrections."},409);
      throw e;
    }
    // The saved private record remains authoritative even if email delivery fails.
    try {
      const pdf = await createScreeningPdf(record);
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from: process.env.APPLICATION_FROM || "Moontera LLC <info@moonterallc.com>",
        to: ["llcmoontera@gmail.com"],
        replyTo: email,
        subject: "Driver screening received - " + name,
        text: "Driver screening submitted.\\nReference: " + id + "\\nDriver: " + name +
          "\\nEmail: " + email + "\\nReceived: " + createdAt +
          "\\n\\nThe completed screening and MVR/PSP authorizations are attached.",
        attachments: [{ filename: "moontera-driver-screening-" + id + ".pdf", content: Buffer.from(pdf) }]
      }, { idempotencyKey: "screening/pdf/" + id + "/owner" });
      if (error || !data?.id) throw Error("Email service did not confirm sending.");
      return respond({ reference: id, success: true, emailSent: true });
    } catch {
      console.error("Screening saved but PDF email delivery failed", id);
      return respond({
        reference: id, success: true, emailSent: false,
        message: "Your screening was saved, but the PDF email could not be delivered. Contact Moontera LLC with this reference."
      });
    }
  }catch(error){
    if(error instanceof Invalid) return respond({message:error.message},400);
    if(error instanceof SyntaxError) return respond({message:"Invalid form data."},400);
    console.error("Screening submission error",error instanceof Error ? error.name : "Unknown");
    return respond({message:"Screening could not be saved. Please try again."},503);
  }
}
