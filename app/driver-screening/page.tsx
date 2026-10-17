import type { Metadata } from "next";
import ScreeningForm from "./ScreeningForm";
import { getScreeningDisclosures } from "@/lib/screening/disclosures";

export const metadata: Metadata = {
  title: "Driver Screening Consents | Moontera LLC",
  description: "Complete screening authorizations from your secure invitation.",
  robots: { index: false, follow: false },
};

export default function DriverScreeningPage() {
  const disclosure = getScreeningDisclosures();
  return (
    <ScreeningForm
      mvr={disclosure.mvr}
      psp={disclosure.psp}
      clearinghouseText={disclosure.clearinghouseText}
      consentPeriod={disclosure.consentPeriod}
      contentHash={disclosure.contentHash}
      approved={disclosure.approved}
    />
  );
}
