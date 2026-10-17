import { createHmac } from "node:crypto";
import { list } from "@vercel/blob";
import { findQuickRecord } from "@/lib/onboarding/records";
import { getAdminSession } from "@/lib/onboarding/admin-auth";
import { readPrivate } from "@/lib/onboarding/private-store";
import type { RecordData } from "@/lib/applications/workflow";

export const runtime = "nodejs";

type PdfRecord = { pdf?: string; id?: string; complete?: boolean; revisionNumber?: number; payload?: RecordData["payload"] };
type ScreeningPointer = { quickId: string; recordPath: string; signedAt: string };
type RevisionIndex = { latestPath?: string | null; latestRevision?: number };

function notFound() {
  return Response.json({ message: "PDF not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  if (!(await getAdminSession(request)))
    return Response.json({ message: "Sign in required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  const kind = url.searchParams.get("kind") || "";
  if (!/^[a-f0-9-]{36}$/i.test(id) || !["quick", "screening", "full", "full-original", "revision"].includes(kind))
    return notFound();
  try {
    const located = await findQuickRecord(id);
    if (!located?.record.complete) return notFound();
    let pdfRecord: PdfRecord | null = null;
    let filename = "";
    if (kind === "quick") {
      pdfRecord = located.record;
      filename = `Moontera-Quick-Application-${id.slice(0, 8)}.pdf`;
    } else if (kind === "screening") {
      const pointer = await readPrivate<ScreeningPointer>(`onboarding/screening/${id}.json`);
      if (!pointer?.value.signedAt || !pointer.value.recordPath.startsWith(`onboarding/screening/records/${id}/`)) return notFound();
      pdfRecord = await readPrivate<PdfRecord>(pointer.value.recordPath).then((value) => value?.value || null);
      filename = `Moontera-Screening-Consents-${id.slice(0, 8)}.pdf`;
    } else {
      if (!process.env.APPLICATION_KEY_SECRET) return notFound();
      const emailHash = createHmac("sha256", process.env.APPLICATION_KEY_SECRET).update(located.record.payload.email).digest("hex");
      if (kind === "revision") {
        const revisionNumber = Number(url.searchParams.get("revision"));
        if (!Number.isInteger(revisionNumber) || revisionNumber < 1) return notFound();
        let cursor: string | undefined;
        for (let page = 0; page < 20; page++) {
          const result = await list({ prefix: `onboarding/full-revisions/${id}/requests/`, limit: 1000, ...(cursor ? { cursor } : {}) });
          for (const blob of result.blobs) {
            const candidate = await readPrivate<PdfRecord & { quickId?: string }>(blob.pathname);
            if (candidate?.value.complete && candidate.value.quickId === id && candidate.value.revisionNumber === revisionNumber) {
              pdfRecord = candidate.value;
              break;
            }
          }
          if (pdfRecord || !result.hasMore) break;
          cursor = result.cursor;
        }
        filename = `Moontera-Full-Application-Revision-${revisionNumber}.pdf`;
      } else if (kind === "full") {
        const index = await readPrivate<RevisionIndex>(`onboarding/full-revisions/${id}/index.json`);
        if (index?.value.latestPath && (index.value.latestRevision || 0) > 0) {
          pdfRecord = await readPrivate<PdfRecord>(index.value.latestPath).then((value) => value?.value || null);
          filename = `Moontera-Full-Application-Revision-${index.value.latestRevision}.pdf`;
        } else {
          pdfRecord = await readPrivate<RecordData>(`applications/full/${emailHash}.json`).then((value) => value?.value || null);
          filename = `Moontera-Full-Application-${id.slice(0, 8)}.pdf`;
        }
      } else {
        pdfRecord = await readPrivate<RecordData>(`applications/full/${emailHash}.json`).then((value) => value?.value || null);
        filename = `Moontera-Full-Application-Original-${id.slice(0, 8)}.pdf`;
      }
    }
    if (!pdfRecord?.pdf || pdfRecord.complete === false) return notFound();
    return new Response(Buffer.from(pdfRecord.pdf, "base64"), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ message: "PDF could not be loaded." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
