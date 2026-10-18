
import type { Metadata } from "next";
import Documents from "./Documents";
export const metadata: Metadata = {
  title: "Driver Policies | Moontera LLC",
  description: "Review and sign Moontera driver policies securely.",
  robots: { index: false, follow: false },
};
export default function Page() { return <Documents />; }
