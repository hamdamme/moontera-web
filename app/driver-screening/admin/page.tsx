import type { Metadata } from "next";
import InvitationManager from "./InvitationManager";
export const metadata: Metadata = { title: "Driver Screening Invitations | Moontera LLC", robots: { index: false, follow: false } };
export default function Page() { return <InvitationManager />; }
