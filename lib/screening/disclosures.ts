import { createHash } from "node:crypto";
import documents from "@/app/apply/documents/documents.json";

type DocumentSection = { title: string; body: string };
type DisclosureDocument = { id: string; title: string; sections: DocumentSection[] };

const source = documents as DisclosureDocument[];

export function getScreeningDisclosures() {
  const mvr = source.find((document) => document.id === "mvr");
  const psp = source.find((document) => document.id === "psp");
  if (!mvr || !psp) throw new Error("Required screening disclosures are missing");
  const clearinghouseText = (process.env.CLEARINGHOUSE_LIMITED_QUERY_TEXT || "").trim();
  const consentPeriod = (process.env.CLEARINGHOUSE_CONSENT_PERIOD || "").trim();
  const approved =
    process.env.SCREENING_LEGAL_APPROVED === "true" &&
    !!clearinghouseText &&
    !!consentPeriod &&
    clearinghouseText.toLowerCase().includes(consentPeriod.toLowerCase());
  const contentHash = createHash("sha256")
    .update(JSON.stringify({ mvr, psp, clearinghouseText, consentPeriod }))
    .digest("hex");
  return {
    mvr,
    psp,
    clearinghouseText,
    consentPeriod,
    approved,
    contentHash,
  };
}
