"use client";

import { useState, type FormEvent } from "react";
import documents from "../apply/documents/documents.json";
import { states } from "../apply/schema";
import { formatPhone, formatZip, normalizeCdl } from "@/lib/applications/smart-fields";
import "./screening.css";

const mvr = documents.find(x => x.id === "mvr")!;
const psp = documents.find(x => x.id === "psp")!;

export default function ScreeningForm() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [zip, setZip] = useState("");
  const [cdl, setCdl] = useState("");
  const [testStatus, setTestStatus] = useState("");
  const [mvrAgree, setMvrAgree] = useState(false);
  const [pspAgree, setPspAgree] = useState(false);
  const [clearinghouseAgree, setClearinghouseAgree] = useState(false);
  const [screeningName, setScreeningName] = useState("");
  const [mvrName, setMvrName] = useState("");
  const [pspName, setPspName] = useState("");
  const [clearinghouseName, setClearinghouseName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
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
    } catch (err) { setMessage(err instanceof Error ? err.message : "Unable to submit. Please retry."); }
    finally { setBusy(false); }
  }
  if (done) return <main className="screening-shell"><section className="screening-card"><h1>Screening information received</h1>
    <p>Thank you. Moontera LLC will review your information and contact you about next steps.</p>
    <p><strong>Reference:</strong> {done}</p>
    <p>Submitting this form does not order a report, schedule a drug test, or replace consent required in the FMCSA Clearinghouse.</p>
  </section></main>;
  return <main className="screening-shell">
    <header className="screening-header"><strong>MOONTERA LLC</strong><span>DRIVER SCREENING</span></header>
    <div className="screening-intro"><h1>Driver Screening</h1>
      <p>Complete your driver information and review each authorization separately.</p>
      <p className="screening-note">Screening does not guarantee employment. No background reports or drug tests are automatically ordered when you submit this form.</p>
    </div>
    <form onSubmit={submit}>
      <div className="screening-honeypot" aria-hidden="true"><label>Leave this blank<input type="text" name="website" tabIndex={-1} autoComplete="off"/></label></div>
      <section className="screening-card"><h2>1. Personal information</h2><div className="screening-grid">
        <label>Full legal name *<input required name="name" autoComplete="name" maxLength={120}/></label>
        <label>Email address *<input name="email" required value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email" maxLength={254}/></label>
        <label>Phone number *<input name="phone" required type="tel" inputMode="numeric" placeholder="773-555-0123" value={phone} onChange={e=>setPhone(formatPhone(e.target.value))} minLength={12} maxLength={12} autoComplete="tel-national"/></label>
        <label>Date of birth *<input name="dob" type="date" required max={today}/></label>
        <label className="screening-wide">Street address *<input name="address" required autoComplete="street-address" maxLength={200}/></label>
        <label>City *<input name="city" required autoComplete="address-level2" maxLength={100}/></label>
        <label>State *<select name="state" required defaultValue="" autoComplete="address-level1"><option value="">Select state</option>{states.map(x=><option key={x}>{x}</option>)}</select></label>
        <label>ZIP code *<input name="zip" required inputMode="numeric" autoComplete="postal-code" value={zip} onChange={e=>setZip(formatZip(e.target.value))} pattern="[0-9]{5}(-[0-9]{4})?"/></label>
      </div></section>
      <section className="screening-card"><h2>2. CDL and medical card</h2><div className="screening-grid">
        <label>CDL number *<input name="cdlNumber" required value={cdl} onChange={e=>setCdl(normalizeCdl(e.target.value))} minLength={3} maxLength={40} autoComplete="off"/></label>
        <label>CDL issuing state *<select name="cdlState" required defaultValue=""><option value="">Select state</option>{states.map(x=><option key={x}>{x}</option>)}</select></label>
        <label>CDL class *<select name="cdlClass" required defaultValue=""><option value="">Select class</option>{["Class A","Class B","Class C"].map(x=><option key={x}>{x}</option>)}</select></label>
        <label>CDL expiration date *<input name="cdlExpiration" type="date" required/></label>
        <label>DOT medical card issue date *<input name="medicalIssue" type="date" max={today} required/></label>
        <label>DOT medical card expiration date *<input name="medicalExpiration" type="date" required/></label>
      </div></section>
      <section className="screening-card"><h2>3. DOT drug test history</h2><p>Report your last DOT drug test if known. A new pre-employment test may still be required.</p>
        <div className="screening-grid"><label>Last DOT drug test *<select name="testStatus" value={testStatus} onChange={e=>setTestStatus(e.target.value)} required><option value="">Select an option</option><option>Date known</option><option>Unknown</option><option>Never tested</option></select></label>
        {testStatus==="Date known" && <label>Last DOT drug test date *<input type="date" name="testDate" required max={today}/></label>}
        <label>Preferred testing location (city/state, optional)<input name="testLocation" maxLength={120} placeholder="e.g., Buffalo Grove, IL"/></label></div>
        <p className="screening-note">Moontera LLC will arrange required drug testing separately. This form does not schedule an appointment.</p>
      </section>
      <section className="screening-card"><h2>4. Motor Vehicle Record (MVR) authorization</h2>
        <p className="screening-note">MVR checks are performed through MVRcheck.com.</p>
        {mvr.sections.map((s,i)=><div className="screening-legal" key={i}><h3>{s.title}</h3>{s.body.split("\n\n").map((t,j)=><p key={j}>{t}</p>)}</div>)}
        <label className="screening-checkbox"><input type="checkbox" name="mvrConsent" value="yes" checked={mvrAgree} onChange={e=>setMvrAgree(e.target.checked)} required/>I have read and authorize the MVR request described above.</label>
        <label>Typed signature for MVR *<input name="mvrSignature" required value={mvrName} onChange={e=>setMvrName(e.target.value)} maxLength={120} autoComplete="off"/></label>
      </section>
      <section className="screening-card"><h2>5. FMCSA PSP disclosure and authorization</h2>
        {psp.sections.map((s,i)=><div className="screening-legal" key={i}><h3>{s.title}</h3>{s.body.split("\n\n").map((t,j)=><p key={j}>{t}</p>)}</div>)}
        <label className="screening-checkbox"><input type="checkbox" name="pspConsent" value="yes" checked={pspAgree} onChange={e=>setPspAgree(e.target.checked)} required/>I have read and authorize the FMCSA PSP report described above.</label>
        <label>Typed signature for PSP *<input name="pspSignature" required value={pspName} onChange={e=>setPspName(e.target.value)} maxLength={120} autoComplete="off"/></label>
      </section>
      <section className="screening-card"><h2>6. FMCSA Clearinghouse limited-query consent</h2>
        <div className="screening-legal"><p>I authorize Moontera LLC to conduct limited queries of the FMCSA Drug & Alcohol Clearinghouse, as permitted by 49 CFR § 382.703, during my service with Moontera LLC. A limited query indicates whether information exists and does not disclose detailed records. I understand that any required full query, including a pre-employment full query, requires separate electronic consent directly through the FMCSA Clearinghouse portal.</p></div>
        <label className="screening-checkbox"><input type="checkbox" name="clearinghouseConsent" value="yes" required checked={clearinghouseAgree} onChange={e=>setClearinghouseAgree(e.target.checked)}/>I consent to the limited Clearinghouse queries described above.</label>
        <label>Typed signature for Clearinghouse limited queries *<input name="clearinghouseSignature" required value={clearinghouseName} onChange={e=>setClearinghouseName(e.target.value)} maxLength={120} autoComplete="off"/></label>
      </section>
      <section className="screening-card"><h2>7. Certification</h2>
        <p>I certify that the information I provided is accurate to the best of my knowledge. Each authorization above is separately acknowledged and signed.</p>
        <label>Full legal name / final certification *<input name="certificationSignature" required value={screeningName} onChange={e=>setScreeningName(e.target.value)} maxLength={120}/></label>
        <label className="screening-checkbox"><input type="checkbox" name="certified" value="yes" required/>I confirm the information and consents provided above.</label>
        <p className="screening-note">Electronic signatures and consent records will be stored privately. Review the <a href="/privacy-policy" target="_blank" rel="noreferrer">Privacy Policy</a> before submitting.</p>
      </section>
      {message && <p role="alert" className="screening-error">{message}</p>}
      <button disabled={busy} className="screening-submit" type="submit">{busy?"Submitting…":draft?"Retry submission":"Submit screening information"}</button>
    </form>
  </main>;
}
