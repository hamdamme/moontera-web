import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  steps,
  visible,
  certification,
  type Answers,
  type Group,
} from "./schema";
export async function createApplicationPdf(
  a: Answers,
  signature: { mode: string; name: string; image: string },
  fontBytes: ArrayBuffer,
) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: true });
  const navy = rgb(0.06, 0.12, 0.21),
    gray = rgb(0.34, 0.4, 0.47),
    blue = rgb(0.14, 0.36, 0.82);
  let page!: PDFPage;
  let y = 0;
  const newPage = () => {
    page = doc.addPage([612, 792]);
    page.drawText("MOONTERA LLC", {
      x: 48,
      y: 750,
      size: 12,
      font,
      color: navy,
    });
    page.drawText("Commercial Driver Application", {
      x: 330,
      y: 750,
      size: 10,
      font,
      color: gray,
    });
    page.drawLine({
      start: { x: 48, y: 736 },
      end: { x: 564, y: 736 },
      color: rgb(0.8, 0.84, 0.88),
      thickness: 1,
    });
    y = 709;
  };
  newPage();
  const linesFor = (text: string, size: number) => {
    const lines: string[] = [];
    for (const block of text
      .replace(/[\x00-\x09\x0b-\x1f]/g, " ")
      .split("\n")) {
      let line = "";
      for (const word of block.split(" ")) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) <= 510) {
          line = next;
          continue;
        }
        if (line) {
          lines.push(line);
          line = "";
        }
        for (const ch of word) {
          if (font.widthOfTextAtSize(line + ch, size) > 510) {
            lines.push(line);
            line = "";
          }
          line += ch;
        }
      }
      lines.push(line);
    }
    return lines;
  };
  const write = (text: string, size = 10, color = navy) => {
    for (const line of linesFor(text, size)) {
      if (y < 66) newPage();
      page.drawText(line, { x: 48, y, size, font, color });
      y -= size + 5;
    }
  };
  const heightFor = (g: Group) =>
    28 +
    (a[g.key] || []).reduce(
      (sum, row) =>
        sum +
        (g.repeat ? 15 : 0) +
        g.fields
          .filter((f) => visible(f, row))
          .reduce(
            (n, f) =>
              n +
              linesFor(
                `${f.label}: ${row[f.key]?.trim() || "Not provided"}`,
                10,
              ).length *
                15,
            0,
          ),
      0,
    );
  write("PREVIEW — NOT SUBMITTED", 10, blue);
  write("info@moonterallc.com  |  773-882-5595", 9, gray);
  y -= 10;
  for (const s of steps) {
    if (y < Math.min(620, 100 + heightFor(s.groups[0]))) newPage();
    write(s.title, 17, blue);
    y -= 6;
    for (const g of s.groups) {
      const groupHeight = heightFor(g);
      if (y < 110 || (groupHeight < 570 && y < groupHeight + 66)) newPage();
      write(g.title, 11, navy);
      if (!a[g.key]?.length) write("No records entered", 9, gray);
      for (const [i, row] of (a[g.key] || []).entries()) {
        if (g.repeat) write(`${g.item} ${i + 1}`, 10, gray);
        for (const f of g.fields) {
          if (!visible(f, row)) continue;
          write(`${f.label}: ${row[f.key]?.trim() || "Not provided"}`, 10);
        }
      }
      y -= 12;
    }
  }
  if (y < 230) newPage();
  write("Applicant certification", 15, blue);
  write(certification);
  y -= 8;
  write(
    "Signature preview — no identity verification or audit certificate",
    9,
    gray,
  );
  write(`Printed name: ${signature.name}`);
  if (signature.mode === "draw" && signature.image) {
    if (y < 220) newPage();
    const img = await doc.embedPng(signature.image);
    page.drawImage(img, { x: 48, y: y - 130, width: 260, height: 130 });
    y -= 145;
  } else write(`Typed signature: ${signature.name}`, 16);
  write(`Generated: ${new Date().toISOString()}`, 9, gray);
  write(
    "Separate MVR / PSP authorizations and policy acknowledgments are not included or executed by this preview.",
    9,
    gray,
  );
  for (const [i, p] of doc.getPages().entries())
    p.drawText(`Application preview • ${i + 1} / ${doc.getPageCount()}`, {
      x: 48,
      y: 33,
      size: 8,
      font,
      color: gray,
    });
  doc.setTitle("Moontera driver application — preview");
  doc.setAuthor("Moontera LLC");
  return doc.save();
}
