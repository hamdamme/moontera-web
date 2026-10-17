"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import "./screening.css";

type Disclosure = { id: string; title: string; sections: { title: string; body: string }[] };
type Props = {
  mvr: Disclosure;
  psp: Disclosure;
  clearinghouseText: string;
  consentPeriod: string;
  contentHash: string;
  approved: boolean;
};
type Invite = { email: string; applicationReference: string; expiresAt: number };
const certification =
  "I certify that all information provided in this driver screening form is true, complete, and accurate to the best of my knowledge. I acknowledge that I have reviewed and completed the applicable disclosures, authorizations, and acknowledgments above. I understand that FMCSA Clearinghouse full-query consent must be provided separately through the official FMCSA Clearinghouse.";

function DisclosureText({ document }: { document: Disclosure }) {
  return (
    <div className="screening-disclosure">
      {document.sections.map((section) => (
        <section key={section.title}>
          <h3>{section.title}</h3>
          {section.body.split(/\n\s*\n/).map((paragraph, index) => (
            <p key={index}>{paragraph.trim()}</p>
          ))}
        </section>
      ))}
    </div>
  );
}

export default function ScreeningForm({
  mvr,
  psp,
  clearinghouseText,
  consentPeriod,
  contentHash,
  approved,
}: Props) {
  const [token, setToken] = useState("");
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState(false);
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState("");
  const [mvrAgreed, setMvrAgreed] = useState(false);
  const [mvrName, setMvrName] = useState("");
  const [pspAgreed, setPspAgreed] = useState(false);
  const [pspName, setPspName] = useState("");
  const [clearinghouseAgreed, setClearinghouseAgreed] = useState(false);
  const [clearinghouseName, setClearinghouseName] = useState("");
  const [certified, setCertified] = useState(false);
  const [certificationName, setCertificationName] = useState("");
  const [certificationDate, setCertificationDate] = useState("");
  const pending = useRef<Record<string, unknown> | null>(null);

  useEffect(() => {
    let active = true;
    const invitationToken = new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
    if (invitationToken) window.history.replaceState(null, "", "/driver-screening");
    async function verifyInvitation() {
      if (!invitationToken) {
        if (active) {
          setMessage("A current Screening invitation is required to open this form.");
          setLoading(false);
        }
        return;
      }
      try {
        const response = await fetch("/api/driver-screening/invitation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: invitationToken }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "This invitation could not be verified.");
        if (active) {
          setToken(invitationToken);
          setInvite(result);
        }
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "This invitation could not be verified.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void verifyInvitation();
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || receipt || !invite || !approved) return;
    setBusy(true);
    setMessage("");
    try {
      if (!pending.current) pending.current = {
        token,
        requestId: crypto.randomUUID(),
        contentHash,
        mvr: { agreed: mvrAgreed, name: mvrName.trim() },
        psp: { agreed: pspAgreed, name: pspName.trim() },
        clearinghouse: { agreed: clearinghouseAgreed, name: clearinghouseName.trim() },
        certification: { agreed: certified, name: certificationName.trim(), date: certificationDate },
      };
      setPendingSubmission(true);
      const response = await fetch("/api/driver-screening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending.current),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 400) {
          pending.current = null;
          setPendingSubmission(false);
        }
        throw new Error(result.message || "Screening consent could not be submitted.");
      }
      setReceipt(result.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Screening consent could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screening-shell">
      <div className="screening-wrap">
        <header className="screening-header">
          <p className="screening-eyebrow">MOONTERA LLC · DRIVER SCREENING</p>
          <h1>Screening Consents</h1>
          <p>Review each disclosure and complete the related authorization yourself.</p>
        </header>
        {loading ? <section className="screening-card">Checking your secure invitation…</section> : null}
        {!loading && !invite ? <section className="screening-card" role="alert">{message}<p>For help, contact <a href="mailto:info@moonterallc.com">info@moonterallc.com</a>.</p></section> : null}
        {!loading && invite && receipt ? (
          <section className="screening-card screening-success">
            <h2>Screening consent submitted</h2>
            <p>Your signed consents were sent to Moontera LLC. A confirmation email is on its way. It does not contain a copy of your signed form.</p>
            <p>Reference: <strong>{receipt}</strong></p>
          </section>
        ) : null}
        {!loading && invite && !receipt && !approved ? (
          <section className="screening-card screening-blocked" role="status">
            <h2>This form is not available yet</h2>
            <p>Moontera is completing review of the Clearinghouse limited-query authorization terms before collecting screening consent. Your invitation remains valid while we finish that review.</p>
            <p>Invited email: <strong>{invite.email}</strong></p>
            <p>For help, contact <a href="mailto:info@moonterallc.com">info@moonterallc.com</a>.</p>
          </section>
        ) : null}
        {!loading && invite && !receipt && approved ? (
          <form onSubmit={submit}>
            <fieldset className="screening-fields" disabled={busy || pendingSubmission}>
            <section className="screening-card screening-identity">
              <h2>01 · Driver identification</h2>
              <label>Verified invitation email<input readOnly value={invite.email} /></label>
              <p>Invitation expires {new Date(invite.expiresAt).toLocaleDateString()}.</p>
            </section>
            <section className="screening-card">
              <h2>02 · Motor Vehicle Record authorization</h2>
              <DisclosureText document={mvr} />
              <label className="screening-check"><input type="checkbox" required checked={mvrAgreed} onChange={(event) => setMvrAgreed(event.target.checked)} /> I have read and agree to the MVR disclosure and authorization above.</label>
              <label>Typed full legal name<input required maxLength={150} value={mvrName} onChange={(event) => setMvrName(event.target.value)} /></label>
            </section>
            <section className="screening-card">
              <h2>03 · FMCSA PSP authorization</h2>
              <DisclosureText document={psp} />
              <label className="screening-check"><input type="checkbox" required checked={pspAgreed} onChange={(event) => setPspAgreed(event.target.checked)} /> I have read and agree to the PSP disclosure and authorization above.</label>
              <label>Typed full legal name<input required maxLength={150} value={pspName} onChange={(event) => setPspName(event.target.value)} /></label>
            </section>
            <section className="screening-card">
              <h2>04 · FMCSA Clearinghouse authorization / acknowledgment</h2>
              <div className="screening-disclosure"><p>Limited-query consent period: {consentPeriod}.</p><p>{clearinghouseText}</p><p>Signing this website form does not provide electronic consent to an official FMCSA Clearinghouse full query. Moontera must request the pre-employment full query separately through the official FMCSA Clearinghouse, where you must provide the required electronic consent. Failure to provide required full-query consent may prevent safety-sensitive driving work.</p></div>
              <label className="screening-check"><input type="checkbox" required checked={clearinghouseAgreed} onChange={(event) => setClearinghouseAgreed(event.target.checked)} /> I have read and agree to the Clearinghouse authorization and acknowledgment above.</label>
              <label>Typed full legal name<input required maxLength={150} value={clearinghouseName} onChange={(event) => setClearinghouseName(event.target.value)} /></label>
              <p className="screening-note">No separate date is requested for this section. The system records the consent timestamp.</p>
            </section>
            <section className="screening-card">
              <h2>05 · Certification</h2>
              <p className="screening-disclosure">{certification}</p>
              <label>Typed full legal name<input required maxLength={150} value={certificationName} onChange={(event) => setCertificationName(event.target.value)} /></label>
              <label>Certification date<input required type="date" max={new Date().toISOString().slice(0, 10)} value={certificationDate} onChange={(event) => setCertificationDate(event.target.value)} /></label>
              <label className="screening-check"><input type="checkbox" required checked={certified} onChange={(event) => setCertified(event.target.checked)} /> I confirm that I have completed the applicable screening disclosures and certify the information above.</label>
            </section>
            </fieldset>
            {message && <p className="screening-message" role="alert">{message}</p>}
            <button className="screening-submit" type="submit" disabled={busy}>{busy ? "Submitting…" : pendingSubmission ? "Retry submission" : "Submit Screening Consents"}</button>
            <p className="screening-note">This website does not order an MVR or PSP report or submit an official full query to the FMCSA Clearinghouse.</p>
          </form>
        ) : null}
      </div>
    </main>
  );
}
