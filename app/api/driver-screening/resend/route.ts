import { createHash, timingSafeEqual } from "node:crypto";
import { get } from "@vercel/blob";
import { Resend } from "resend";
import { publicScreeningKey } from "@/lib/screening/invite";
import { createScreeningPdf, type ScreeningRecord } from "@/lib/screening/pdf";

export const runtime = "nodejs";
const reply = (data: unknown, status = 200) => Response.json(data, {status,headers:{"Cache-Control":"no-store"}});
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && !["https://www.moonterallc.com","https://moonterallc.com",new URL(request.url).origin].includes(origin))
    return reply({message:"Invalid request origin."},403);
  const key = process.env.SCREENING_ADMIN_KEY;
  if (!key || key.length < 20 || !process.env.APPLICATION_KEY_SECRET || !process.env.RESEND_API_KEY)
    return reply({message:"Screening administration is not configured."},503);
  const entered = request.headers.get("x-screening-admin-key") || "";
  if (entered.length>500) return reply({message:"Not authorized."},401);
  const hash = (v:string)=>createHash("sha256").update(v).digest();
  if (!timingSafeEqual(hash(entered),hash(key))) return reply({message:"Not authorized."},401);
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) return reply({message:"Invalid request."},415);
    if (Number(request.headers.get("content-length"))>2000) return reply({message:"Request too large."},413);
    const body = await request.json() as {email?:unknown};
    if (typeof body.email!=="string" || body.email.length>254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(body.email))
      return reply({message:"Enter a valid driver email."},400);
    const email=body.email.trim().toLowerCase();
    const existing = await get(publicScreeningKey(email),{access:"private"});
    if (!existing?.stream) return reply({message:"No saved screening was found for this email."},404);
    const record = JSON.parse(await new Response(existing.stream).text()) as ScreeningRecord;
    if (record.driver?.email !== email || !record.consents?.mvr || !record.consents?.psp)
      return reply({message:"Stored screening is invalid."},503);
    const pdf=await createScreeningPdf(record);
    const resend=new Resend(process.env.RESEND_API_KEY);
    const {data,error}=await resend.emails.send({
      from:process.env.APPLICATION_FROM || "Moontera LLC <info@moonterallc.com>",
      to:["llcmoontera@gmail.com"],
      replyTo:email,
      subject:"Driver screening PDF - " + record.driver.name,
      text:"Saved screening PDF attached.\nReference: "+record.id+"\nDriver: "+record.driver.name+"\nEmail: "+email,
      attachments:[{filename:"moontera-driver-screening-"+record.id+".pdf",content:Buffer.from(pdf)}]
    },{idempotencyKey:"screening/resend/"+record.id+"/"+new Date().toISOString().slice(0,13)});
    if(error||!data?.id)throw Error("Email send unconfirmed");
    return reply({success:true,reference:record.id});
  }catch {
    console.error("Screening PDF resend failed");
    return reply({message:"Unable to resend PDF. Check the saved screening and email configuration."},503);
  }
}
