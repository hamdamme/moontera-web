import { getFullApplicantSession } from "@/lib/onboarding/full-auth";
import { initialAnswers, type Answers } from "@/app/apply/schema";
import { readPrivate } from "@/lib/onboarding/private-store";
import { createHmac } from "node:crypto";
import type { RecordData } from "@/lib/applications/workflow";

export const runtime = "nodejs";

type FullDraft = {
  quickId: string;
  email: string;
  answers: Answers;
  updatedAt: string;
  retentionEndsAt: number;
};
type RevisionIndex = { latestRevision: number; latestPath: string | null };
type SignedFull = { id: string; complete: boolean; payload: RecordData["payload"] };

function displayDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : "";
}

function splitName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 2) return { first: parts[0], middle: "", last: parts[1] };
  return { first: value.trim(), middle: "", last: "" };
}

function oldAddress(value: string) {
  const match = /^(.*?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/.exec(value.trim());
  if (!match) return { city: "", state: "", zip: "" };
  const cityState = match[1].split(",");
  return { city: cityState.at(-1)?.trim() || "", state: match[2], zip: match[3] };
}

export async function GET(request: Request) {
  try {
    const session = await getFullApplicantSession(request);
    if (!session)
      return Response.json({ message: "Email verification required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const stored = await readPrivate<RecordData>(session.quickPath);
    if (
      !stored ||
      stored.value.id !== session.quickId ||
      stored.value.payload.kind !== "quick" ||
      !stored.value.complete
    )
      return Response.json({ message: "The invitation's application record is unavailable." }, { status: 404, headers: { "Cache-Control": "no-store" } });

    const quick = stored.value.payload.quick || {};
    const answers = initialAnswers();
    answers.personal[0] = {
      ...answers.personal[0],
      ...splitName(stored.value.payload.name),
      position: quick.position || "",
      dob: displayDate(quick.dob || ""),
      phone: quick.phone || "",
      email: session.email,
      startDate: displayDate(quick.start_date || ""),
    };
    const parsedAddress = quick.city_state_zip ? oldAddress(quick.city_state_zip) : { city: "", state: "", zip: "" };
    answers.current[0] = {
      ...answers.current[0],
      street: quick.address || "",
      city: quick.city || parsedAddress.city,
      state: quick.state || parsedAddress.state,
      zip: quick.zip || parsedAddress.zip,
      from: "",
    };
    answers.licenses[0] = {
      ...answers.licenses[0],
      number: quick.cdl_number || "",
      state: quick.cdl_state || "",
      class: quick.cdl_class || "",
      expires: displayDate(quick.cdl_expiration || ""),
      issued: "",
    };
    answers.medical[0] = {
      ...answers.medical[0],
      expires: displayDate(quick.medical_card_expiration || ""),
    };
    const draft = await readPrivate<FullDraft>(`onboarding/full-drafts/${session.quickId}.json`);
    const retainedDraft = !!draft &&
      draft.value.quickId === session.quickId &&
      draft.value.email === session.email &&
      draft.value.retentionEndsAt > Date.now();
    const emailHash = createHmac("sha256", process.env.APPLICATION_KEY_SECRET || "")
      .update(session.email).digest("hex");
    const baseRecord = process.env.APPLICATION_KEY_SECRET
      ? await readPrivate<RecordData>(`applications/full/${emailHash}.json`)
      : null;
    const revisionIndex = await readPrivate<RevisionIndex>(`onboarding/full-revisions/${session.quickId}/index.json`);
    const latestRevision = revisionIndex?.value.latestRevision || 0;
    const latestRevisionRecord = revisionIndex?.value.latestPath
      ? await readPrivate<SignedFull>(revisionIndex.value.latestPath)
      : null;
    const signedRecord = latestRevisionRecord?.value.complete && latestRevisionRecord.value.payload.email === session.email
      ? latestRevisionRecord
      : baseRecord?.value.complete && baseRecord.value.payload.kind === "full" && baseRecord.value.payload.email === session.email
        ? { value: baseRecord.value as SignedFull, etag: baseRecord.etag }
        : null;
    return Response.json(
      {
        success: true,
        answers: retainedDraft
          ? draft.value.answers
          : signedRecord?.value.payload.answers || answers,
        verifiedEmail: session.email,
        expiresAt: session.expiresAt,
        onFile: !!signedRecord,
        latestId: signedRecord?.value.id || "",
        revisionNumber: signedRecord ? latestRevision : 0,
        draftVersion: retainedDraft ? draft.etag : null,
        draftSavedAt: retainedDraft ? draft.value.updatedAt : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ message: "The application could not be loaded." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
