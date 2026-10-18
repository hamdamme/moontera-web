
import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import documents from "../../app/apply/documents/documents.json";

const policyIds = new Set(["safety", "cargo", "accident"]);

export async function createPolicyPacketPdf(fontBytes: Uint8Array) {
  const policies = documents.filter((document) => policyIds.has(document.id));
  if (policies.length !== policyIds.size)
    throw new Error("The driver policy packet is incomplete");

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const navy = rgb(0.08, 0.15, 0.25);
  const gray = rgb(0.36, 0.43, 0.52);
  const border = rgb(0.83, 0.86, 0.9);
  const pageWidth = 612;
  const margin = 52;
  let page!: PDFPage;
  let y = 0;
  let pageNumber = 0;

  const startPage = () => {
    page = pdf.addPage([pageWidth, 792]);
    pageNumber++;
    page.drawText("MOONTERA LLC", {
      x: margin,
      y: 748,
      size: 11,
      font,
      color: navy,
    });
    page.drawText("DRIVER POLICIES", {
      x: pageWidth - margin - font.widthOfTextAtSize("DRIVER POLICIES", 9),
      y: 749,
      size: 9,
      font,
      color: gray,
    });
    page.drawLine({
      start: { x: margin, y: 733 },
      end: { x: pageWidth - margin, y: 733 },
      thickness: 0.8,
      color: border,
    });
    page.drawText("Driver Policy Packet", {
      x: margin,
      y: 698,
      size: 19,
      font,
      color: navy,
    });
    page.drawText("For review by Moontera LLC applicants and drivers", {
      x: margin,
      y: 680,
      size: 9,
      font,
      color: gray,
    });
    page.drawLine({
      start: { x: margin, y: 36 },
      end: { x: pageWidth - margin, y: 36 },
      thickness: 0.6,
      color: border,
    });
    page.drawText("Questions? info@moonterallc.com  |  773-882-5595", {
      x: margin,
      y: 21,
      size: 8,
      font,
      color: gray,
    });
    page.drawText(String(pageNumber), {
      x: pageWidth - margin - font.widthOfTextAtSize(String(pageNumber), 8),
      y: 21,
      size: 8,
      font,
      color: gray,
    });
    y = 650;
  };

  const wrap = (text: string, width: number, size: number) => {
    const lines: string[] = [];
    for (const paragraph of text.replace(/\r/g, "").split("\n")) {
      if (!paragraph.trim()) {
        lines.push("");
        continue;
      }
      let line = "";
      for (const word of paragraph.trim().split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= width) {
          line = candidate;
        } else {
          if (line) lines.push(line);
          line = word;
        }
      }
      if (line) lines.push(line);
    }
    return lines;
  };

  const ensure = (height: number) => {
    if (y - height < 55) startPage();
  };

  startPage();
  for (const policy of policies) {
    ensure(46);
    page.drawText(policy.title, {
      x: margin,
      y: y - 16,
      size: 13,
      font,
      color: navy,
    });
    y -= 31;
    for (const section of policy.sections) {
      const titleLines = wrap(section.title, pageWidth - margin * 2, 9);
      ensure(titleLines.length * 13 + 15);
      for (const line of titleLines) {
        page.drawText(line, { x: margin, y: y - 9, size: 9, font, color: navy });
        y -= 13;
      }
      const paragraphs = section.body.split("\n");
      for (const paragraph of paragraphs) {
        const text = paragraph.trim();
        if (!text) {
          y -= 4;
          continue;
        }
        const bullet = /^[-•]\s*/.test(text);
        const content = bullet ? `•  ${text.replace(/^[-•]\s*/, "")}` : text;
        for (const line of wrap(content, pageWidth - margin * 2, 8.5)) {
          ensure(12);
          page.drawText(line, {
            x: margin + (bullet ? 7 : 0),
            y: y - 8.5,
            size: 8.5,
            font,
            color: gray,
          });
          y -= 12;
        }
      }
      y -= 7;
    }
    y -= 8;
  }
  return pdf.save();
}

export async function createSignedPolicyPacketPdf(
  fontBytes: Uint8Array,
  signer: { name: string; email: string; signedAt: string; reference: string; signatureImage?: string },
) {
  const policies = documents.filter((document) => policyIds.has(document.id));
  if (policies.length !== policyIds.size)
    throw new Error("The driver policy packet is incomplete");

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const signatureImage = signer.signatureImage
    ? await pdf.embedPng(Buffer.from(signer.signatureImage.replace(/^data:image\/png;base64,/, ""), "base64"))
    : undefined;
  const navy = rgb(0.08, 0.15, 0.25);
  const gray = rgb(0.36, 0.43, 0.52);
  const border = rgb(0.83, 0.86, 0.9);
  const pageWidth = 612;
  const margin = 52;
  let page!: PDFPage;
  let y = 0;
  let pageNumber = 0;

  const startPage = () => {
    page = pdf.addPage([pageWidth, 792]);
    pageNumber++;
    page.drawText("MOONTERA LLC", { x: margin, y: 748, size: 11, font, color: navy });
    const label = "SIGNED DRIVER POLICIES";
    page.drawText(label, { x: pageWidth - margin - font.widthOfTextAtSize(label, 9), y: 749, size: 9, font, color: gray });
    page.drawLine({ start: { x: margin, y: 733 }, end: { x: pageWidth - margin, y: 733 }, thickness: 0.8, color: border });
    page.drawLine({ start: { x: margin, y: 36 }, end: { x: pageWidth - margin, y: 36 }, thickness: 0.6, color: border });
    page.drawText("Questions? info@moonterallc.com  |  773-882-5595", { x: margin, y: 21, size: 8, font, color: gray });
    page.drawText(String(pageNumber), { x: pageWidth - margin - font.widthOfTextAtSize(String(pageNumber), 8), y: 21, size: 8, font, color: gray });
    y = 705;
  };
  const wrap = (text: string, width: number, size: number) => {
    const lines: string[] = [];
    for (const paragraph of text.replace(/\r/g, "").split("\n")) {
      if (!paragraph.trim()) { lines.push(""); continue; }
      let line = "";
      for (const word of paragraph.trim().split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
        else { if (line) lines.push(line); line = word; }
      }
      if (line) lines.push(line);
    }
    return lines;
  };
  const ensure = (height: number) => { if (y - height < 55) startPage(); };

  startPage();
  for (const policy of policies) {
    ensure(50);
    page.drawText(policy.title, { x: margin, y: y - 16, size: 13, font, color: navy });
    y -= 31;
    for (const section of policy.sections) {
      const titleLines = wrap(section.title, pageWidth - margin * 2, 9);
      ensure(titleLines.length * 13 + 15);
      for (const line of titleLines) { page.drawText(line, { x: margin, y: y - 9, size: 9, font, color: navy }); y -= 13; }
      for (const paragraph of section.body.split("\n")) {
        const text = paragraph.trim();
        if (!text) { y -= 4; continue; }
        const bullet = /^[-•]\s*/.test(text);
        const content = bullet ? `•  ${text.replace(/^[-•]\s*/, "")}` : text;
        for (const line of wrap(content, pageWidth - margin * 2, 8.5)) {
          ensure(12);
          page.drawText(line, { x: margin + (bullet ? 7 : 0), y: y - 8.5, size: 8.5, font, color: gray });
          y -= 12;
        }
      }
      y -= 7;
    }
    ensure(90);
    y -= 6;
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.6, color: border });
    y -= 20;
    const acknowledgment = `I confirm that I reviewed and acknowledge the ${policy.title}.`;
    for (const line of wrap(acknowledgment, pageWidth - margin * 2, 9)) {
      ensure(14); page.drawText(line, { x: margin, y: y - 9, size: 9, font, color: navy }); y -= 14;
    }
    ensure(42);
    if (signatureImage) {
      const scaled = signatureImage.scale(Math.min(0.45, 165 / signatureImage.width));
      page.drawImage(signatureImage, { x: margin, y: y - 31, width: scaled.width, height: scaled.height });
    }
    page.drawText(`Electronically signed by: ${signer.name}`, { x: margin, y: y - 10, size: 9, font, color: navy });
    page.drawText(`Email: ${signer.email}`, { x: margin, y: y - 24, size: 8, font, color: gray });
    page.drawText(`Date and time: ${signer.signedAt}`, { x: margin, y: y - 37, size: 8, font, color: gray });
    y -= 55;
    page.drawText(`Submission reference: ${signer.reference}`, { x: margin, y: y - 8, size: 7, font, color: gray });
    y -= 20;
  }
  pdf.setTitle(`Signed Driver Policies - ${signer.name}`);
  pdf.setAuthor("Moontera LLC");
  pdf.setCreationDate(new Date(signer.signedAt));
  pdf.setModificationDate(new Date(signer.signedAt));
  return pdf.save();
}
