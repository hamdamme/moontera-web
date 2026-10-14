"use client";

import { useState, type FormEvent } from "react";
import "../screening.css";

type ScreeningRow = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  testDate: string;
  mvrSignature: string;
  pspSignature: string;
  certification: string;
};

export default function ScreeningDashboard() {
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [submissions, setSubmissions] = useState<ScreeningRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");

  async function load(next?: string | null) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/driver-screening/admin/list", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-screening-admin-key": password },
        body: JSON.stringify({ cursor: next || undefined }),
        cache: "no-store"
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.message || "Unable to load submissions.");
      const incoming = result.submissions as ScreeningRow[];
      setSubmissions(previous => {
        const combined = next ? [...previous, ...incoming] : incoming;
        return [...new Map(combined.map(item => [item.id, item])).values()]
          .sort((a,b) => b.createdAt.localeCompare(a.createdAt));
      });
      setCursor(result.cursor || null);
      setLoggedIn(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load submissions.");
    } finally { setBusy(false); }
  }

  async function signin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await load();
  }

  async function pdf(row: ScreeningRow) {
    setWorking(row.id + ":pdf"); setMessage("");
    try {
      const response = await fetch("/api/driver-screening/admin/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-screening-admin-key": password },
        body: JSON.stringify({ email: row.email }),
        cache: "no-store"
      });
      if (!response.ok) {
        const result = await response.json();
        throw Error(result.message || "Unable to download PDF.");
      }
      const file = await response.blob();
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "moontera-driver-screening-" + row.id + ".pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch(error) {
      setMessage(error instanceof Error ? error.message : "Unable to download PDF.");
    } finally { setWorking(""); }
  }

  async function emailPdf(row: ScreeningRow) {
    setWorking(row.id + ":email"); setMessage("");
    try {
      const response = await fetch("/api/driver-screening/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-screening-admin-key": password },
        body: JSON.stringify({ email: row.email }),
        cache: "no-store"
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.message || "Unable to email PDF.");
      setMessage("PDF email accepted for " + row.name + ". Check llcmoontera@gmail.com.");
    } catch(error) {
      setMessage(error instanceof Error ? error.message : "Unable to email PDF.");
    } finally { setWorking(""); }
  }

  const filtered = submissions.filter(row => (row.name + " " + row.email).toLowerCase().includes(query.toLowerCase()));

  return <main className="screening-shell">
    <header className="screening-header"><strong>MOONTERA LLC</strong><span>SCREENING ADMINISTRATION</span></header>
    <section className="screening-card" style={{margin:"34px auto",maxWidth:820}}>
      <h1>Driver Screening Responses</h1>
      <p>Review saved driver responses, download signed PDF records, or email PDFs to llcmoontera@gmail.com. Drivers can apply directly at <a href="/driver-screening">/driver-screening</a> without an invitation.</p>
      {!loggedIn ? <form onSubmit={signin}>
        <label>Admin password<input type="password" autoComplete="off" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
        <button className="screening-submit" type="submit" disabled={busy}>{busy?"Loading…":"View driver responses"}</button>
        <p className="screening-note">Use your existing screening administration key. It protects private driver records; it is not a driver invitation key.</p>
      </form> : <>
        <div className="screening-admin-toolbar">
          <label>Search drivers<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name or email"/></label>
          <button type="button" disabled={busy} onClick={()=>load()}>Refresh</button>
          <button type="button" onClick={()=>{setLoggedIn(false);setSubmissions([]);setPassword("");setCursor(null);setMessage("");}}>Sign out</button>
        </div>
        {filtered.length===0 ? <p>{submissions.length?"No matching driver responses.":"No saved direct-link screening responses found."}</p> : <div className="screening-admin-list">
          {filtered.map(row => <section key={row.id} className="screening-admin-entry">
            <h2>{row.name}</h2>
            <p><strong>Email:</strong> {row.email}</p>
            <p><strong>Submitted:</strong> {new Date(row.createdAt).toLocaleString()}</p>
            <p><strong>Last DOT drug test:</strong> {row.testDate || "Not provided"}</p>
            <p><strong>MVR signature:</strong> {row.mvrSignature || "Not recorded"} | <strong>PSP signature:</strong> {row.pspSignature || "Not recorded"}</p>
            <p><strong>Final certification:</strong> {row.certification || "Not recorded"}</p>
            <div className="screening-admin-actions">
              <button type="button" disabled={!!working} onClick={()=>pdf(row)}>{working===row.id+":pdf"?"Preparing…":"Download PDF"}</button>
              <button type="button" disabled={!!working} onClick={()=>emailPdf(row)}>{working===row.id+":email"?"Sending…":"Email PDF"}</button>
            </div>
          </section>)}
        </div>}
        {cursor && <button className="screening-submit" disabled={busy} type="button" onClick={()=>load(cursor)}>{busy?"Loading…":"Load more responses"}</button>}
      </>}
      {message && <p role="status" className={message.startsWith("PDF email accepted")?"screening-note":"screening-error"}>{message}</p>}
    </section>
  </main>;
}
