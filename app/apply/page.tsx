import type { Metadata } from "next";
import Application from "./Application";
export const metadata: Metadata = {
  title: "Full Driver Application Preview | Moontera LLC",
  description: "A step-by-step driver application for Moontera LLC.",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <Application />;
}
