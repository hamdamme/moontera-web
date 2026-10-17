"use client";

import { useState, type FormEvent } from "react";
import documents from "../apply/documents/documents.json";
import "./screening.css";

const mvr = documents.find(x => x.id === "mvr")!;
const psp = documents.find(x => x.id === "psp")!;

export default function ScreeningForm() {
  const [email, setEmail] = useState("");
  const [mvrAgree, setMvrAgree] = useState(false);
  const [pspAgree, setPspAgree] = useState(false);
  const [clearingAgree, setClearingAgree] = useState(false);
  const [clearingName, setClearingName] = useState("");
  const [screeningName, setScreeningName] = useState("");
  const [mvrName, setMvrName] = useState("");
  const [pspName, setPspName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [deliveryIssue, setDeliveryIssue] = useState("");
  const [message, setMessage] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || done) return;
    setBusy(true); setMessage("");
    try {
      const data = draft || Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
      if (!draft) setDraft(data);
      const r = await fetch("/api/driver-screening", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }) });
      const result = await r.json();
      if (!r.ok) { if (r.status === 400) setDraft(null); throw Error(result.message || "Please try again."); }
      setDone(result.reference);
      if (result.emailSent === false) setDeliveryIssue(result.message || "Saved, but the email was not delivered.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Unable to submit. Please retry."); }
    finally { setBusy(false); }
  }
  if (done) return <main className="screening-shell"><section className="screening-card"><h1>Screening information received</h1>
    <p>Thank you. Moontera LLC will review your information and contact you about next steps.</p>
    <p><strong>Reference:</strong> {done}</p>
    {deliveryIssue && <p role="alert" className="screening-error">{deliveryIssue}</p>}
    <p>Submitting this form does not order a report, schedule a drug test, or replace consent required in the FMCSA Clearinghouse.</p>
  </section></main>;
  return <main className="screening-shell">
    <header className="screening-header"><strong>MOONTERA LLC</strong><span>DRIVER SCREENING</span></header>
    <div className="screening-intro"><h1>Driver Screening</h1>
      <p>Review and sign the MVR and PSP authorizations and FMCSA Clearinghouse acknowledgment.</p>
      <p className="screening-note">Screening does not guarantee employment. No background reports or drug tests are automatically ordered when you submit this form.</p>
    </div>
    <form onSubmit={submit}>
      <div className="screening-honeypot" aria-hidden="true"><label>Leave this blank<input type="text" name="website" tabIndex={-1} autoComplete="off"/></label></div>
      <section className="screening-card"><h2>1. Driver identification</h2>
        <p>Your email address is used to identify your screening record.</p>
        <div className="screening-grid">
          <label>Email address *<input name="email" required value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email" maxLength={254}/></label>
        </div>
      </section>
      <section className="screening-card"><h2>2. Motor Vehicle Record (MVR) authorization</h2>
        <p className="screening-note">MVR checks are performed through MVRcheck.com.</p>
        {mvr.sections.map((s,i)=><div className="screening-legal" key={i}><h3>{s.title}</h3>{s.body.split("\n\n").map((t,j)=><p key={j}>{t}</p>)}</div>)}
        <label className="screening-checkbox"><input type="checkbox" name="mvrConsent" value="yes" checked={mvrAgree} onChange={e=>setMvrAgree(e.target.checked)} required/>I have read and authorize the MVR request described above.</label>
        <label>Typed signature for MVR *<input name="mvrSignature" required value={mvrName} onChange={e=>setMvrName(e.target.value)} maxLength={120} autoComplete="off"/></label>
      </section>
      <section className="screening-card"><h2>3. FMCSA PSP disclosure and authorization</h2>
        {psp.sections.map((s,i)=><div className="screening-legal" key={i}><h3>{s.title}</h3>{s.body.split("\n\n").map((t,j)=><p key={j}>{t}</p>)}</div>)}
        <label className="screening-checkbox"><input type="checkbox" name="pspConsent" value="yes" checked={pspAgree} onChange={e=>setPspAgree(e.target.checked)} required/>I have read and authorize the FMCSA PSP report described above.</label>
        <label>Typed signature for PSP *<input name="pspSignature" required value={pspName} onChange={e=>setPspName(e.target.value)} maxLength={120} autoComplete="off"/></label>
      </section>
      <section className="screening-card"><h2>4. FMCSA Clearinghouse full-query consent</h2>
        <p>A required pre-employment full query must be authorized electronically by the driver in the official FMCSA Clearinghouse after Moontera LLC submits the query request.</p>
        <p><a href="https://clearinghouse.fmcsa.dot.gov/" target="_blank" rel="noopener noreferrer">Open FMCSA Clearinghouse ↗</a></p>
        <p className="screening-note">This page does not grant full-query consent. Complete the separate FMCSA request when it appears in your Clearinghouse account.</p>
        <p>I authorize Moontera LLC to conduct permitted FMCSA Drug &amp; Alcohol Clearinghouse limited queries, subject to applicable requirements and the consent period specified by Moontera.</p>
        <p>I understand that a required pre-employment full query requires my separate electronic consent in the official FMCSA Clearinghouse. Failure to provide the required consent may prevent me from performing safety-sensitive driving duties.</p>
        <label className="screening-checkbox"><input type="checkbox" name="clearinghouseConsent" value="yes" checked={clearingAgree} onChange={e=>setClearingAgree(e.target.checked)} required/>I have read and acknowledge the Clearinghouse information above.</label>
        <label>Typed full legal name for Clearinghouse acknowledgment *<input name="clearinghouseSignature" required value={clearingName} onChange={e=>setClearingName(e.target.value)} maxLength={120}/></label>
      </section>
      <section className="screening-card"><h2>5. Certification</h2>
        <p>I certify that all information in this driver screening form is true, complete, and accurate to the best of my knowledge. I have reviewed the applicable disclosures, authorizations, and acknowledgments above. I understand that FMCSA full-query consent must be provided separately through the official Clearinghouse.</p>
        <label>Full legal name / final certification *<input name="certificationSignature" required value={screeningName} onChange={e=>setScreeningName(e.target.value)} maxLength={120}/></label>
        <label>Certification date *<input name="certificationDate" type="date" required defaultValue={today} max={today}/></label>
        <label className="screening-checkbox"><input type="checkbox" name="certified" value="yes" required/>I confirm the information and authorizations provided above.</label>
        <p className="screening-note">Electronic signatures and consent records will be stored privately. Review the <a href="/privacy-policy" target="_blank" rel="noreferrer">Privacy Policy</a> before submitting.</p>
      </section>
      {message && <p role="alert" className="screening-error">{message}</p>}
      <button disabled={busy} className="screening-submit" type="submit">{busy?"Submitting…":draft?"Retry submission":"Submit screening information"}</button>
    </form>
  </main>;
}
