import type { Metadata } from "next";
import QuickApplication from "./QuickApplication";
export const metadata: Metadata = {
  title: "Quick Application | Moontera LLC",
  description:
    "Apply to Moontera LLC with your contact information and preferred driving role.",
};
export default function Page() {
  return <QuickApplication />;
}
