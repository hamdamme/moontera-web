import type { Metadata } from "next";
import ScreeningDashboard from "./ScreeningDashboard";
export const metadata: Metadata = {
  title: "Driver Screening Responses | Moontera LLC",
  robots: { index: false, follow: false },
  referrer: "no-referrer"
};
export default function Page() { return <ScreeningDashboard />; }
