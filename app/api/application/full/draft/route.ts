import { InputError, sanitizeDraftAnswers } from "@/lib/applications/model";
import { getFullApplicantSession } from "@/lib/onboarding/full-auth";
import { validAdminOrigin } from "@/lib/onboarding/admin-auth";
import { draftRetentionDeadline } from "@/lib/onboarding/draft-lifecycle";
import { createPrivate, readPrivate, updatePrivate } from "@/lib/onboarding/private-store";
import type { Answers } from "@/app/apply/schema";

export const runtime = "nodejs";

type FullDraft = {
  quickId: string;
  email: string;
  answers: Answers;
  updatedAt: string;
  retentionEndsAt: number;
};

export async function PUT(request: Request) {
  if (!validAdminOrigin(request))
    return Response.json({ message: "Invalid request origin." }, { status: 403 });
  if (Number(request.headers.get("content-length")) > 350000)
    return Response.json({ message: "Draft is too large." }, { status: 413 });
  try {
    const session = await getFullApplicantSession(request);
    if (!session)
      return Response.json({ message: "Verify your invitation before saving." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ message: "Missing draft." }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.length;
      if (length > 350000) {
        await reader.cancel();
        return Response.json({ message: "Draft is too large." }, { status: 413 });
      }
      chunks.push(part.value);
    }
    let body: Record<string, unknown>;
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { return Response.json({ message: "Invalid draft data." }, { status: 400 }); }
    const answers = sanitizeDraftAnswers({ answers: body?.answers }, session.email);
    const key = `onboarding/full-drafts/${session.quickId}.json`;
    const current = await readPrivate<FullDraft>(key);
    const draft: FullDraft = {
      quickId: session.quickId,
      email: session.email,
      answers,
      updatedAt: new Date().toISOString(),
      retentionEndsAt: draftRetentionDeadline(
        current?.value.retentionEndsAt,
        session.expiresAt,
      ),
    };
    let version: string | null;
    if (current && current.value.retentionEndsAt > Date.now()) {
      if (body?.version !== current.etag)
        return Response.json({ message: "A newer draft is already saved. Reload the application to continue." }, { status: 409, headers: { "Cache-Control": "no-store" } });
      version = await updatePrivate(key, draft, current.etag);
    } else if (current) {
      version = await updatePrivate(key, draft, current.etag);
    } else {
      version = await createPrivate(key, draft);
    }
    if (!version)
      return Response.json({ message: "The draft changed while saving. Reload the application to continue." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    return Response.json(
      { success: true, version, savedAt: draft.updatedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const isInput = error instanceof InputError;
    return Response.json(
      { message: isInput ? error.message : "The private draft could not be saved." },
      { status: isInput ? 400 : 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
