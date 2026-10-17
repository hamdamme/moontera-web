import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import documents from "@/app/apply/documents/documents.json";

export type ScreeningRecord = {
  id: string; createdAt: string;
  driver: { email: string; name: string; testDate?: string };
  consents: { mvr: { signedBy: string; signedAt: string }; psp: { signedBy: string; signedAt: string }; clearinghouse?: { signedBy: string; signedAt: string; confirmed: boolean } };
  certification: { signedBy: string; at: string; date?: string };
};

export async function createScreeningPdf(record: ScreeningRecord): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]);
  let y = 749;
  const safe = (value: string) => value.replace(/[^\x20-\x7e]/g, " ");
  const addPage = () => { page = pdf.addPage([612, 792]); y = 746; };
  const write = (value: string, title = false) => {
    const face = title ? bold : font; const size = title ? 12 : 9;
    const width = 514;
    for (const paragraph of safe(value).split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        if (!word) continue;
        const candidate = line ? line + " " + word : word;
        if (face.widthOfTextAtSize(candidate,size) > width && line) {
          if (y < 56) addPage();
          page.drawText(line,{x:49,y,font:face,size,color:rgb(.13,.18,.26)}); y-=14; line="";
        }
        for (const ch of word + " ") {
          if (face.widthOfTextAtSize(line+ch,size)>width && line) {
            if (y < 56) addPage();
            page.drawText(line.trimEnd(),{x:49,y,font:face,size,color:rgb(.13,.18,.26)}); y-=14;line="";
          }
          line+=ch;
        }
      }
      if (y < 56) addPage();
      if(line)page.drawText(line.trimEnd(),{x:49,y,font:face,size,color:rgb(.13,.18,.26)});
      y-=title?22:15;
    }
    y-=title?5:7;
  };
  write("MOONTERA LLC",true);
  write("SCREENING CONSENTS",true);
  write("30 Copperwood Dr, Buffalo Grove, IL 60089");
  write("773-882-5595 | info@moonterallc.com");
  write("Reference: " + record.id);
  write("Submitted (UTC): " + record.createdAt);
  write("Driver: " + record.driver.name);
  write("Email: " + record.driver.email);
  for (const kind of ["mvr","psp"] as const) {
    write(kind==="mvr"?"MOTOR VEHICLE RECORD AUTHORIZATION":"FMCSA PSP DISCLOSURE AND AUTHORIZATION",true);
    const doc = documents.find(x=>x.id===kind);
    for(const section of doc?.sections||[]) {write(section.title,true);write(section.body);}
    write("Authorization accepted: Yes");
    write("Typed signature: " + record.consents[kind].signedBy);
    write("Signed (UTC): " + record.consents[kind].signedAt);
  }
  write("FMCSA CLEARINGHOUSE ACKNOWLEDGMENT",true);
  write("A required pre-employment full query must be authorized electronically through the official FMCSA Clearinghouse after Moontera LLC submits the request. This PDF does not replace that consent.");
  write("Acknowledgment accepted: " + (record.consents.clearinghouse?.confirmed ? "Yes" : "Not recorded"));
  write("Typed full legal name: " + (record.consents.clearinghouse?.signedBy || "Not recorded"));
  write("CERTIFICATION",true);
  write("I certify that all information in this driver screening form is true, complete, and accurate to the best of my knowledge. I have reviewed the applicable disclosures, authorizations, and acknowledgments above. I understand that FMCSA full-query consent must be provided separately through the official Clearinghouse.");
  write("Typed signature: " + record.certification.signedBy);
  write("Certification date: " + (record.certification.date || record.certification.at.slice(0,10)));
  write("Certified (UTC): " + record.certification.at);
  write("FMCSA Clearinghouse full queries require separate electronic consent in the official FMCSA Clearinghouse. This document is not full-query consent.");
  pdf.getPages().forEach((p,i)=>{p.drawLine({start:{x:48,y:44},end:{x:564,y:44},color:rgb(.78,.83,.89),thickness:.6});p.drawText("MOONTERA LLC  |  SCREENING CONSENTS",{x:49,y:30,font,size:8,color:rgb(.36,.43,.52)});p.drawText(`${i+1} / ${pdf.getPageCount()}`,{x:530,y:30,font,size:8});});
  pdf.setTitle("Screening Consents - "+record.driver.name);
  return pdf.save();
}
