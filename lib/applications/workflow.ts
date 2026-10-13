import { createHash, randomUUID } from "node:crypto";
import type { Submission } from "./model";
export type RecordData = {
  id: string;
  payload: Submission;
  digest: string;
  createdAt: string;
  pdf: string;
  ownerEmailId?: string;
  applicantEmailId?: string;
  leaseUntil: number;
  attemptStartedAt?: number;
  complete: boolean;
};
export type Versioned = { record: RecordData; version: string };
export interface Store {
  read(key: string): Promise<Versioned | null>;
  create(key: string, record: RecordData): Promise<Versioned | null>;
  save(
    key: string,
    record: RecordData,
    version: string,
  ): Promise<Versioned | null>;
}
export interface WorkflowDeps {
  store: Store;
  pdf: (payload: Submission, id: string, date: string) => Promise<Uint8Array>;
  send: (
    record: RecordData,
    recipient: "owner" | "applicant",
  ) => Promise<string>;
  now?: () => number;
}
export class SubmissionError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function processSubmission(
  key: string,
  payload: Submission,
  deps: WorkflowDeps,
) {
  const now = deps.now || Date.now;
  const digest = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
  let stored = await deps.store.read(key);
  if (!stored) {
    const id = randomUUID(),
      createdAt = new Date(now()).toISOString();
    const pdf = Buffer.from(await deps.pdf(payload, id, createdAt)).toString(
      "base64",
    );
    stored = await deps.store.create(key, {
      id,
      payload,
      digest,
      createdAt,
      pdf,
      leaseUntil: 0,
      complete: false,
    });
    if (!stored) stored = await deps.store.read(key);
  }
  if (!stored) throw new SubmissionError(503, "Please try again in a moment.");
  let { record, version } = stored;
  if (record.payload.requestId !== payload.requestId)
    throw new SubmissionError(
      409,
      "An application of this type has already been received for this email. Contact info@moonterallc.com if you need to update it.",
    );
  if (record.complete) return { id: record.id, alreadySubmitted: true };
  if (record.digest !== digest)
    throw new SubmissionError(
      409,
      "Your original submission is being processed. Retry without changing the answers, or contact info@moonterallc.com.",
    );
  if (record.leaseUntil > now())
    throw new SubmissionError(
      409,
      "Your application is being processed. Please wait a moment, then retry.",
    );
  // Do not automatically repeat uncertain email delivery after the provider's 24-hour idempotency window.
  if (
    record.attemptStartedAt &&
    now() - record.attemptStartedAt > 23 * 60 * 60 * 1000
  )
    throw new SubmissionError(
      503,
      `Your application is saved but delivery needs attention. Contact info@moonterallc.com with reference ${record.id}. Please do not submit another application.`,
    );
  const lease = await deps.store.save(
    key,
    { ...record, leaseUntil: now() + 120000 },
    version,
  );
  if (!lease)
    throw new SubmissionError(
      409,
      "Your application is being processed. Please wait a moment, then retry.",
    );
  record = lease.record;
  version = lease.version;
  const persist = async (next: RecordData) => {
    const saved = await deps.store.save(key, next, version);
    if (!saved) throw new Error("Submission update conflict");
    record = saved.record;
    version = saved.version;
  };
  try {
    if (!record.attemptStartedAt)
      await persist({ ...record, attemptStartedAt: now() });
    if (!record.ownerEmailId) {
      const id = await deps.send(record, "owner");
      await persist({ ...record, ownerEmailId: id });
    }
    if (!record.applicantEmailId) {
      const id = await deps.send(record, "applicant");
      await persist({ ...record, applicantEmailId: id });
    }
    await persist({ ...record, complete: true, leaseUntil: 0 });
    return { id: record.id, alreadySubmitted: false };
  } catch {
    try {
      await persist({ ...record, leaseUntil: 0 });
    } catch {
      /* The lease expires if the store is temporarily unavailable. */
    }
    throw new SubmissionError(
      503,
      `Your application is saved, but email delivery is not finished. Retry to finish the same submission. Reference: ${record.id}.`,
    );
  }
}
