"use client";
import { useState, type FormEvent } from "react";
import "../screening.css";

export default function InvitationManager() {
  const [key, setKey] = useState("");
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendStatus,setResendStatus] = useState("");
  const [resendEmail,setResendEmail] = useState("");
  const [resendKey,setResendKey] = useState("");
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
  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setResendStatus("");
    try {
      const response=await fetch("/api/driver-screening/resend",{
        method:"POST",headers:{"Content-Type":"application/json","x-screening-admin-key":resendKey},
        body:JSON.stringify({email:resendEmail})
      });
      const result=await response.json();
      if(!response.ok)throw Error(result.message || "Unable to send PDF.");
      setResendStatus("PDF sent to llcmoontera@gmail.com. Reference: "+result.reference); setResendKey("");
    }catch(error){setResendStatus(error instanceof Error?error.message:"Unable to send PDF.");}
    finally{setBusy(false);}
  }
  return <main className="screening-shell"><section className="screening-card">
    <h1>Driver Screening Invitations</h1>
    <p>Moontera LLC internal use only. Use the shared screening link directly. Invitations are no longer needed.</p>
    <form onSubmit={generate}>
      <label>Driver email<input type="email" autoComplete="off" value={email} required onChange={e=>setEmail(e.target.value)}/></label>
      <label>Invitation management key<input type="password" autoComplete="off" value={key} required onChange={e=>setKey(e.target.value)}/></label>
      <button type="submit" className="screening-submit" disabled={busy}>{busy?"Creating…":"Create invitation link"}</button>
    </form>
    {link && <div className="screening-legal"><h2>Invitation ready</h2><p>The link expires in seven days and can be submitted once.</p>
      <textarea readOnly rows={5} style={{width:"100%",overflowWrap:"anywhere",padding:12}} value={link}/>
      <button type="button" className="screening-submit" onClick={()=>navigator.clipboard.writeText(link)}>Copy link</button></div>}
    {message && <p role="alert" className="screening-error">{message}</p>}
    <hr style={{margin:"32px 0",border:"none",borderTop:"1px solid #dae1ea"}}/>
    <h2>Resend saved screening PDF</h2>
    <p>Send a PDF for a previously submitted driver screening to the company email address.</p>
    <form onSubmit={resend}>
      <label>Submitted driver email<input type="email" required value={resendEmail} onChange={e=>setResendEmail(e.target.value)} autoComplete="off"/></label>
      <label>Screening admin key<input type="password" required value={resendKey} onChange={e=>setResendKey(e.target.value)} autoComplete="off"/></label>
      <button className="screening-submit" disabled={busy} type="submit">{busy?"Sending…":"Email saved screening PDF"}</button>
    </form>
    {resendStatus && <p role="status">{resendStatus}</p>}
  </section></main>;
}
