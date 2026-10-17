import { PDFDocument, rgb, type PDFPage, type PDFEmbeddedPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { steps, visible, certification } from "../../app/apply/schema";
import { quickFields, type Submission } from "./model";

export async function createSubmissionPdf(
  submission: Submission,
  id: string,
  createdAt: string,
  fontBytes: Uint8Array,
  templateBytes?: Uint8Array,
  revisionNumber?: number,
) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: true });
  const navy = rgb(0.08, 0.15, 0.25),
    gray = rgb(0.36, 0.43, 0.52),
    blue = rgb(0.13, 0.36, 0.85),
    border = rgb(0.78, 0.83, 0.89),
    pale = rgb(0.965, 0.976, 0.992);
  const title =
    submission.kind === "quick"
      ? "Quick Driver Application"
      : "Commercial Driver Application";
  let logo: PDFEmbeddedPage | undefined;
  if (templateBytes) {
    const template = await PDFDocument.load(templateBytes);
    logo = await doc.embedPage(template.getPage(0), {
      left: 48,
      bottom: 707,
      right: 120,
      top: 772,
    });
  }
  let page!: PDFPage;
  let y = 0;
  const wrap = (value: string, width: number, size: number) => {
    const lines: string[] = [];
    const text = value.replace(/[\x00-\x08\x0b-\x1f]/g, " ");
    for (const block of text.split("\n")) {
      let line = "";
      for (const word of block.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) <= width) {
          line = next;
          continue;
        }
        if (line) {
          lines.push(line);
          line = "";
        }
        for (const ch of word) {
          if (font.widthOfTextAtSize(line + ch, size) > width) {
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
  const start = () => {
    page = doc.addPage([612, 792]);
    const first = doc.getPageCount() === 1;
    if (first) {
      if (logo) page.drawPage(logo, { x: 48, y: 703, width: 64, height: 58 });
      page.drawText("MOONTERA LLC", {
        x: logo ? 124 : 48,
        y: 731,
        size: 19,
        font,
        color: navy,
      });
      const parts =
        submission.kind === "quick"
          ? ["Quick Driver", "Application"]
          : ["Commercial Driver", "Application"];
      parts.forEach((t, i) =>
        page.drawText(t, {
          x: 564 - font.widthOfTextAtSize(t, 14),
          y: 744 - i * 19,
          size: 14,
          font,
          color: navy,
        }),
      );
      page.drawText("30 Copperwood Dr, Buffalo Grove, IL 60089", {
        x: 48,
        y: 687,
        size: 8,
        font,
        color: gray,
      });
      const contact = "773-882-5595 | info@moonterallc.com";
      page.drawText(contact, {
        x: 564 - font.widthOfTextAtSize(contact, 8),
        y: 687,
        size: 8,
        font,
        color: gray,
      });
      y = 661;
    } else {
      page.drawText("MOONTERA LLC", {
        x: 48,
        y: 753,
        size: 10,
        font,
        color: navy,
      });
      page.drawText(title, {
        x: 564 - font.widthOfTextAtSize(title, 9),
        y: 753,
        size: 9,
        font,
        color: gray,
      });
      y = 724;
    }
    page.drawLine({
      start: { x: 48, y: y + 14 },
      end: { x: 564, y: y + 14 },
      thickness: 0.8,
      color: border,
    });
  };
  const ensure = (height: number) => {
    if (y - height < 58) start();
  };
  const paragraph = (text: string, size = 9) => {
    for (const line of wrap(text, 516, size)) {
      ensure(size + 5);
      page.drawText(line, { x: 48, y: y - size, size, font, color: gray });
      y -= size + 5;
    }
    y -= 8;
  };
  let section = 0;
  const heading = (text: string) => {
    ensure(90);
    section++;
    page.drawRectangle({
      x: 48,
      y: y - 21,
      width: 26,
      height: 23,
      color: blue,
    });
    page.drawText(String(section).padStart(2, "0"), {
      x: 53,
      y: y - 14,
      size: 10,
      font,
      color: rgb(1, 1, 1),
    });
    page.drawText(text, { x: 84, y: y - 15, size: 13, font, color: navy });
    y -= 36;
  };
  type Cell = { label: string; value: string };
  const row = (cells: Cell[]) => {
    const gap = 10,
      width = (516 - gap * (cells.length - 1)) / cells.length;
    const prepared = cells.map((c) => ({
      labels: wrap(c.label, width - 16, 8),
      values: wrap(c.value || "Not provided", width - 16, 10),
    }));
    const height = Math.max(
      ...prepared.map((c) => c.labels.length * 11 + c.values.length * 14 + 18),
    );
    if (height > 610) {
      for (const cell of cells) {
        const lines = wrap(cell.value || "Not provided", 500, 10);
        for (let offset = 0; offset < lines.length; offset += 32)
          row([
            {
              label: cell.label + (offset ? " (continued)" : ""),
              value: lines.slice(offset, offset + 32).join("\n"),
            },
          ]);
      }
      return;
    }
    ensure(height + 9);
    prepared.forEach((c, i) => {
      const x = 48 + i * (width + gap);
      page.drawRectangle({
        x,
        y: y - height,
        width,
        height,
        color: pale,
        borderColor: border,
        borderWidth: 0.7,
      });
      let cy = y - 13;
      c.labels.forEach((line) => {
        page.drawText(line, { x: x + 8, y: cy, size: 8, font, color: gray });
        cy -= 11;
      });
      cy -= 3;
      c.values.forEach((line) => {
        page.drawText(line, { x: x + 8, y: cy, size: 10, font, color: navy });
        cy -= 14;
      });
    });
    y -= height + 9;
  };
  const blankField = (label: string, height = 42) => {
    ensure(height + 10);
    page.drawRectangle({
      x: 48,
      y: y - height,
      width: 516,
      height,
      color: rgb(1, 1, 1),
      borderColor: border,
      borderWidth: 0.8,
    });
    page.drawText(label, { x: 56, y: y - 14, size: 8, font, color: gray });
    page.drawLine({
      start: { x: 56, y: y - height + 8 },
      end: { x: 556, y: y - height + 8 },
      color: border,
      thickness: 0.6,
    });
    y -= height + 9;
  };
  const hiredCheckboxes = () => {
    const height = 44;
    ensure(height + 10);
    page.drawRectangle({
      x: 48,
      y: y - height,
      width: 516,
      height,
      color: pale,
      borderColor: border,
      borderWidth: 0.7,
    });
    page.drawText("Applicant hired", {
      x: 56,
      y: y - 13,
      size: 8,
      font,
      color: gray,
    });
    for (const [label, x] of [["Yes", 160], ["No", 228]] as const) {
      page.drawRectangle({
        x,
        y: y - 35,
        width: 11,
        height: 11,
        borderColor: gray,
        borderWidth: 0.8,
      });
      page.drawText(label, { x: x + 17, y: y - 34, size: 10, font, color: navy });
    }
    y -= height + 9;
  };
  start();
  paragraph(
    `Received: ${new Date(createdAt).toLocaleDateString("en-US", { timeZone: "UTC" })} (UTC)    Application reference: ${id}`,
    8,
  );
  if (revisionNumber)
    paragraph(`DRIVER-CERTIFIED AMENDMENT — REVISION ${revisionNumber}`, 9);
  if (submission.kind === "quick") {
    heading("Applicant information");
    const fields = quickFields.map((f) => ({
      label: f.label,
      value: f.type === "date" ? (submission.quick?.[f.key] || "").replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$2/$3/$1") : submission.quick?.[f.key] || "",
    }));
    for (let i = 0; i < fields.length; i += 2) row(fields.slice(i, i + 2));
  } else {
    paragraph(
      "Moontera LLC is an equal opportunity employer. This application records the information and acknowledgments submitted by the applicant.",
    );
    for (const step of steps)
      for (const group of step.groups) {
        heading(group.title);
        if (group.description) paragraph(group.description);
        const allRecords = submission.answers?.[group.key] || [];
        const records =
          group.key === "experience"
            ? allRecords.filter((record) => record.selected === "Yes")
            : allRecords;
        if (!records.length) {
          row([
            {
              label: group.title,
              value:
                group.key === "experience"
                  ? "No driving experience selected"
                  : "No records reported",
            },
          ]);
          continue;
        }
        for (const [index, record] of records.entries()) {
          if (group.key === "experience") {
            const dates = `${record.from || "Not provided"} - ${record.to || "Not provided"}`;
            row([
              { label: "Equipment Type", value: record.equipment || "Other" },
              { label: "From / To", value: dates },
              { label: "Approximate Miles", value: record.miles || "Not provided" },
              ...(record.equipment === "Other"
                ? [{ label: "Other Equipment", value: record.other || "Not provided" }]
                : []),
            ]);
            continue;
          }
          if (group.repeat) {
            ensure(70);
            paragraph(`${group.item || "Record"} ${index + 1}`, 9);
          }
          let pending: Cell[] = [];
          const flush = () => {
            if (pending.length) row(pending);
            pending = [];
          };
          for (const field of group.fields) {
            if (!visible(field, record)) continue;
            const value = record[field.key] || "Not provided";
            const cell = { label: field.label, value };
            if (
              field.type === "textarea" ||
              field.label.length > 48 ||
              value.length > 110
            ) {
              flush();
              row([cell]);
            } else {
              pending.push(cell);
              if (pending.length === 2) flush();
            }
          }
          flush();
        }
      }
    heading("Applicant certification");
    paragraph(certification);
    row([
      {
        label: "Certification accepted",
        value: submission.certified ? "Yes" : "No",
      },
      { label: "Printed name", value: submission.signature?.name || "" },
    ]);
    if (submission.signature?.mode === "draw") {
      const image = await doc.embedPng(submission.signature.image);
      if (image.width > 2000 || image.height > 2000)
        throw Error("Signature dimensions exceed limit");
      ensure(132);
      page.drawRectangle({
        x: 48,
        y: y - 120,
        width: 516,
        height: 120,
        color: pale,
        borderColor: border,
        borderWidth: 0.7,
      });
      page.drawText("Applicant signature", {
        x: 56,
        y: y - 14,
        size: 8,
        font,
        color: gray,
      });
      const scale = Math.min(300 / image.width, 85 / image.height);
      page.drawImage(image, {
        x: 58,
        y: y - 110,
        width: image.width * scale,
        height: image.height * scale,
      });
      y -= 132;
    } else
      row([
        {
          label: "Typed electronic signature",
          value: submission.signature?.name || "",
        },
      ]);
    paragraph(
      "The signature above was provided with this web application. Separate MVR / PSP authorizations and policy signatures are not included in this application submission.",
      8,
    );
    heading("COMPANY USE ONLY");
    hiredCheckboxes();
    row([
      { label: "Date employed", value: "____________________________" },
    ]);
    row([
      { label: "Department", value: "____________________________" },
      { label: "Classification", value: "____________________________" },
    ]);
    blankField("Interviewing agent", 36);
    blankField("Remarks / summary", 64);
    row([
      { label: "Date terminated", value: "____________________________" },
      { label: "Supervisor", value: "____________________________" },
    ]);
  }
  paragraph(`Submitted electronically at ${createdAt}.`, 8);
  doc.getPages().forEach((p, i) => {
    p.drawLine({
      start: { x: 48, y: 45 },
      end: { x: 564, y: 45 },
      color: border,
      thickness: 0.6,
    });
    p.drawText(`MOONTERA LLC | ${submission.kind.toUpperCase()} APPLICATION`, {
      x: 48,
      y: 31,
      size: 7,
      font,
      color: gray,
    });
    const pages = `${i + 1} / ${doc.getPageCount()}`;
    p.drawText(pages, {
      x: 564 - font.widthOfTextAtSize(pages, 8),
      y: 31,
      size: 8,
      font,
      color: navy,
    });
  });
  doc.setTitle(`${title} - ${submission.name}`);
  doc.setAuthor("Moontera LLC");
  doc.setCreationDate(new Date(createdAt));
  doc.setModificationDate(new Date(createdAt));
  return doc.save();
}
