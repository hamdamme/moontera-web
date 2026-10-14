"use client";
import { useState, type FormEvent } from "react";
import "../screening.css";

export default function InvitationManager() {
  const [key, setKey] = useState("");
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(""); setLink(""); setBusy(true);
    try {
      const response = await fetch("/api/driver-screening/invite", {
        method: "POST", headers: { "Content-Type": "application/json", "x-screening-admin-key": key },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.message || "Unable to create invitation.");
      setLink(result.url); setKey("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create invitation."); }
    finally { setBusy(false); }
  }
  return <main className="screening-shell"><section className="screening-card">
    <h1>Driver Screening Invitations</h1>
    <p>Moontera LLC internal use only. Create a seven-day invitation for one driver. The invitation link grants access to the screening form.</p>
    <form onSubmit={generate}>
      <label>Driver email<input type="email" autoComplete="off" value={email} required onChange={e=>setEmail(e.target.value)}/></label>
      <label>Invitation management key<input type="password" autoComplete="off" value={key} required onChange={e=>setKey(e.target.value)}/></label>
      <button type="submit" className="screening-submit" disabled={busy}>{busy?"Creating…":"Create invitation link"}</button>
    </form>
    {link && <div className="screening-legal"><h2>Invitation ready</h2><p>The link expires in seven days and can be submitted once.</p>
      <textarea readOnly rows={5} style={{width:"100%",overflowWrap:"anywhere",padding:12}} value={link}/>
      <button type="button" className="screening-submit" onClick={()=>navigator.clipboard.writeText(link)}>Copy link</button></div>}
    {message && <p role="alert" className="screening-error">{message}</p>}
  </section></main>;
}
