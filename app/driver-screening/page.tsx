import type { Metadata } from "next";
import { verifyInvite } from "@/lib/screening/invite";
import ScreeningForm from "./ScreeningForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Driver Screening | Moontera LLC", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { invite } = await searchParams;
  const valid = invite ? verifyInvite(invite) : null;
  if (!valid) return <main className="screening-shell"><section className="screening-card">
    <h1>Driver Screening</h1><p>This page requires a valid invitation from Moontera LLC. The invitation may have expired.</p>
    <p>Contact <a href="mailto:info@moonterallc.com">info@moonterallc.com</a> to request a new link.</p>
  </section></main>;
  return <ScreeningForm invite={invite!} email={valid.email} />;
}
