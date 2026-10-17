import { PDFDocument, rgb, type PDFEmbeddedPage, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

type DisclosureDoc = { title: string; sections: { title: string; body: string }[] };
export type ScreeningPdfData = {
  id: string;
  name: string;
  email: string;
  submittedAt: string;
  certificationDate: string;
  mvrName: string;
  pspName: string;
  clearinghouseName: string;
  certificationName: string;
  signedAt: string;
  disclosureHash: string;
};

export async function createScreeningPdf(
  data: ScreeningPdfData,
  disclosures: {
    mvr: DisclosureDoc;
    psp: DisclosureDoc;
    clearinghouseText: string;
    consentPeriod: string;
  },
  fontBytes: Uint8Array,
  templateBytes: Uint8Array,
) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: true });
  const template = await PDFDocument.load(templateBytes);
  const logo: PDFEmbeddedPage = await doc.embedPage(template.getPage(0), {
    left: 48,
    bottom: 707,
    right: 120,
    top: 772,
  });
  const navy = rgb(0.08, 0.15, 0.25);
  const gray = rgb(0.36, 0.43, 0.52);
  const blue = rgb(0.13, 0.36, 0.85);
  const border = rgb(0.78, 0.83, 0.89);
  const pale = rgb(0.965, 0.976, 0.992);
  const wrap = (value: string, width: number, size: number) => {
    const lines: string[] = [];
    for (const block of value.replace(/[\x00-\x08\x0b-\x1f]/g, " ").split("\n")) {
      let line = "";
      for (const word of block.split(/\s+/)) {
        if (!word) continue;
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) <= width) {
          line = next;
          continue;
        }
        if (line) lines.push(line);
        line = "";
        for (const character of word) {
          if (font.widthOfTextAtSize(line + character, size) > width) {
            lines.push(line);
            line = "";
          }
          line += character;
        }
      }
      lines.push(line);
    }
    return lines;
  };
  let page!: PDFPage;
  let y = 0;
  const start = () => {
    page = doc.addPage([612, 792]);
    if (doc.getPageCount() === 1) {
      page.drawPage(logo, { x: 48, y: 703, width: 64, height: 58 });
      page.drawText("MOONTERA LLC", { x: 124, y: 731, size: 19, font, color: navy });
      page.drawText("SCREENING CONSENTS", {
        x: 564 - font.widthOfTextAtSize("SCREENING CONSENTS", 14),
        y: 731,
        size: 14,
        font,
        color: navy,
      });
      page.drawText("30 Copperwood Dr, Buffalo Grove, IL 60089", {
        x: 48,
        y: 687,
        size: 8,
        font,
        color: gray,
      });
      page.drawText("773-882-5595 | info@moonterallc.com", {
        x: 564 - font.widthOfTextAtSize("773-882-5595 | info@moonterallc.com", 8),
        y: 687,
        size: 8,
        font,
        color: gray,
      });
      y = 660;
    } else {
      page.drawText("MOONTERA LLC", { x: 48, y: 753, size: 10, font, color: navy });
      page.drawText("SCREENING CONSENTS", {
        x: 564 - font.widthOfTextAtSize("SCREENING CONSENTS", 9),
        y: 753,
        size: 9,
        font,
        color: gray,
      });
      y = 724;
    }
    page.drawLine({ start: { x: 48, y: y + 12 }, end: { x: 564, y: y + 12 }, color: border, thickness: 0.8 });
  };
  const ensure = (height: number) => {
    if (y - height < 63) start();
  };
  const paragraph = (value: string, size = 9, color = gray) => {
    const blocks = value.replace(/\r\n?/g, "\n").replace(/(?<!\n)\n(?!\n)/g, " ").split(/\n\s*\n/);
    for (const block of blocks) {
      for (const line of wrap(block, 516, size)) {
        ensure(size + 7);
        page.drawText(line, { x: 48, y: y - size, size, font, color });
        y -= size + 5;
      }
      y -= 5;
    }
  };
  const heading = (title: string, number: string) => {
    ensure(105);
    page.drawRectangle({ x: 48, y: y - 20, width: 27, height: 22, color: blue });
    page.drawText(number, { x: 53, y: y - 14, size: 9, font, color: rgb(1, 1, 1) });
    page.drawText(title, { x: 84, y: y - 15, size: 12, font, color: navy });
    y -= 32;
  };
  const signature = (label: string, name: string, when: string) => {
    ensure(44);
    page.drawRectangle({ x: 48, y: y - 39, width: 516, height: 39, color: pale, borderColor: border, borderWidth: 0.7 });
    page.drawRectangle({ x: 57, y: y - 22, width: 10, height: 10, borderColor: blue, borderWidth: 1 });
    page.drawLine({ start: { x: 59, y: y - 18 }, end: { x: 62, y: y - 21 }, color: blue, thickness: 1.2 });
    page.drawLine({ start: { x: 62, y: y - 21 }, end: { x: 67, y: y - 14 }, color: blue, thickness: 1.2 });
    const value = `${label}: ${name}    Recorded: ${when}`;
    const lines = wrap(value, 478, 8);
    lines.forEach((line, index) => page.drawText(line, { x: 76, y: y - 15 - index * 10, size: 8, font, color: navy }));
    y -= 48;
  };

  start();
  const formatUtc = (value: string) => {
    const date = new Date(value);
    return Number.isFinite(date.valueOf())
      ? `${date.toLocaleString("en-US", { timeZone: "UTC" })} UTC`
      : value;
  };
  paragraph(`Applicant: ${data.name} | Verified email: ${data.email}`, 9, navy);
  paragraph(`Submission reference: ${data.id} | Received: ${formatUtc(data.submittedAt)}`, 8);
  heading("Driver Identification", "01");
  paragraph(`Full legal name: ${data.name}\nVerified invitation email: ${data.email}`, 9, navy);
  heading("Motor Vehicle Record (MVR) Authorization", "02");
  for (const section of disclosures.mvr.sections) {
    paragraph(section.title.toUpperCase(), 8, navy);
    paragraph(section.body, 9);
  }
  signature("MVR authorization acknowledged by", data.mvrName, formatUtc(data.signedAt));
  heading("FMCSA Pre-Employment Screening Program (PSP)", "03");
  for (const section of disclosures.psp.sections) {
    paragraph(section.title, 8, navy);
    paragraph(section.body, 9);
  }
  signature("PSP authorization acknowledged by", data.pspName, formatUtc(data.signedAt));
  heading("FMCSA Clearinghouse Authorization / Acknowledgment", "04");
  paragraph(`Limited-query consent period: ${disclosures.consentPeriod}.`, 9, navy);
  paragraph(disclosures.clearinghouseText, 9);
  paragraph(
    "This website form is not electronic consent to an official FMCSA Clearinghouse full query. Moontera must request the pre-employment full query through the official Clearinghouse, where the driver provides separate required consent. Failure to provide full-query consent can prevent safety-sensitive driving work.",
    9,
  );
  signature("Clearinghouse acknowledgment by", data.clearinghouseName, formatUtc(data.signedAt));
  heading("Certification", "05");
  paragraph(
    "I certify that all information provided in this driver screening form is true, complete, and accurate to the best of my knowledge. I acknowledge that I have reviewed and completed the applicable disclosures, authorizations, and acknowledgments above. I understand that FMCSA Clearinghouse full-query consent must be provided separately through the official FMCSA Clearinghouse.",
    9,
  );
  signature(
    `Certification accepted by ${data.certificationName}; certification date ${data.certificationDate}`,
    data.certificationName,
    formatUtc(data.signedAt),
  );
  paragraph(`Disclosure content SHA-256: ${data.disclosureHash}`, 7);
  doc.getPages().forEach((item, index) => {
    item.drawLine({ start: { x: 48, y: 45 }, end: { x: 564, y: 45 }, color: border, thickness: 0.6 });
    item.drawText("MOONTERA LLC | SCREENING CONSENTS", { x: 48, y: 31, size: 7, font, color: gray });
    const pageLabel = `${index + 1} / ${doc.getPageCount()}`;
    item.drawText(pageLabel, { x: 564 - font.widthOfTextAtSize(pageLabel, 8), y: 31, size: 8, font, color: navy });
  });
  doc.setTitle(`Screening Consents - ${data.name}`);
  doc.setAuthor("Moontera LLC");
  doc.setCreationDate(new Date(data.submittedAt));
  doc.setModificationDate(new Date(data.submittedAt));
  return doc.save();
}
