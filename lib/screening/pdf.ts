import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import documents from "@/app/apply/documents/documents.json";

export type ScreeningRecord = {
  id: string; createdAt: string;
  driver: { email: string; name: string; testDate?: string };
  consents: { mvr: { signedBy: string; signedAt: string }; psp: { signedBy: string; signedAt: string } };
  certification: { signedBy: string; at: string };
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
  write("MOONTERA LLC | DRIVER SCREENING",true);
  write("Reference: " + record.id);
  write("Submitted (UTC): " + record.createdAt);
  write("Driver: " + record.driver.name);
  write("Email: " + record.driver.email);
  write("Last DOT drug test: " + (record.driver.testDate || "Not provided"));
  for (const kind of ["mvr","psp"] as const) {
    write(kind==="mvr"?"MOTOR VEHICLE RECORD AUTHORIZATION":"FMCSA PSP DISCLOSURE AND AUTHORIZATION",true);
    const doc = documents.find(x=>x.id===kind);
    for(const section of doc?.sections||[]) {write(section.title,true);write(section.body);}
    write("Authorization accepted: Yes");
    write("Typed signature: " + record.consents[kind].signedBy);
    write("Signed (UTC): " + record.consents[kind].signedAt);
  }
  write("CERTIFICATION",true);
  write("I certify the information submitted is accurate to the best of my knowledge. The MVR and PSP authorizations were separately acknowledged and signed.");
  write("Typed signature: " + record.certification.signedBy);
  write("Certified (UTC): " + record.certification.at);
  write("FMCSA Clearinghouse full queries require separate electronic consent in the official FMCSA Clearinghouse. This document is not full-query consent.");
  return pdf.save();
}
