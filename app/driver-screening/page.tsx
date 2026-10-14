import type { Metadata } from "next";
import ScreeningForm from "./ScreeningForm";
export const metadata: Metadata = { title: "Driver Screening | Moontera LLC", robots: { index: false, follow: false } };
export default function Page() { return <ScreeningForm />; }
