import { list } from "@vercel/blob";
import type { RecordData } from "@/lib/applications/workflow";
import { readPrivate } from "./private-store";

export type ApplicationSummary = Pick<RecordData, "id" | "createdAt" | "completedAt" | "complete"> & {
  name: string;
  email: string;
  position: string;
  state: string;
  kind: "quick" | "full";
};
export type LocatedQuickRecord = { pathname: string; record: RecordData; etag: string };

export async function listApplicationRecords(cursor?: string) {
  const result = await list({
    prefix: "applications/",
    limit: 25,
    ...(cursor ? { cursor } : {}),
  });
  const paths = result.blobs
    .map((blob) => blob.pathname)
    .filter((pathname) => pathname.startsWith("applications/quick/") && pathname.endsWith(".json"));
  const records = await Promise.all(
    paths.map(async (pathname) => {
      try {
        const stored = await readPrivate<RecordData>(pathname);
        return stored && !stored.value.deletedAt
          ? { pathname, record: stored.value, etag: stored.etag }
          : null;
      } catch {
        return null;
      }
    }),
  );
  return {
    records: records.filter((record): record is LocatedQuickRecord => !!record),
    cursor: result.hasMore ? result.cursor : null,
  };
}

export async function findQuickRecord(id: string) {
  let cursor: string | undefined;
  for (let page = 0; page < 100; page++) {
    const result = await listApplicationRecords(cursor);
    const record = result.records.find(
      (candidate) => candidate.record.payload.kind === "quick" && candidate.record.id === id,
    );
    if (record) return record;
    if (!result.cursor) return null;
    cursor = result.cursor;
  }
  throw new Error("Application lookup exceeded the paging safety limit");
}

export function toApplicationSummary(record: RecordData): ApplicationSummary {
  const quick = record.payload.quick || {};
  return {
    id: record.id,
    createdAt: record.createdAt,
    completedAt: record.completedAt,
    complete: record.complete,
    name: record.payload.name,
    email: record.payload.email,
    position: quick.position || "",
    state: quick.state || "",
    kind: record.payload.kind,
  };
}
