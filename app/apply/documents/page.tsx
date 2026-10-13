import type { Metadata } from "next";
import Documents from "./Documents";
export const metadata: Metadata = {
  title: "Driver Documents Preview | Moontera LLC",
  description: "Review Moontera driver authorizations and company policies.",
  robots: { index: false, follow: false },
};
export default function Page() { return <Documents />; }
