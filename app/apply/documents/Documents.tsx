"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import documents from "./documents.json";
import { states } from "../schema";
import "./documents.css";

type Entry = { name: string; state: string; signature: string; ink: string; mode: string; agreed: boolean; copy: boolean; reviewed: boolean; passenger: string; origin: string; destination: string; start: string; end: string; vin: string };
const empty = (): Entry => ({ name: "", state: "", signature: "", ink: "", mode: "type", agreed: false, copy: false, reviewed: false, passenger: "", origin: "", destination: "", start: "", end: "", vin: "" });
const passenger = { id: "passenger", title: "Passenger Authorization Request", sections: [{ title: "Request company approval", body: "A passenger may travel only after Moontera LLC issues written authorization for the specific passenger, vehicle, route, and dates. Completing this request does not grant permission to transport a passenger." }] };
const policyDocuments = documents.filter((item) => item.id !== "mvr" && item.id !== "psp");
const all = [...policyDocuments, passenger];

function Text({ body }: { body: string }) {
  const paragraphs: string[] = [];
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) { if (paragraphs.at(-1) !== "") paragraphs.push(""); continue; }
    const bullet = /^[-•]|^\d+\.|^o(?:police|witness|insurance|photos)/.test(line);
    if (bullet || !paragraphs.length || paragraphs.at(-1) === "" || /[.:]$/.test(paragraphs.at(-1) || "") || /^[-•]/.test(paragraphs.at(-1) || "")) paragraphs.push(line);
    else paragraphs[paragraphs.length - 1] += " " + line;
  }
  return paragraphs.filter(Boolean).map((line, i) => /^[-•]|^o(?:police|witness|insurance|photos)/.test(line) ? <p className="doc-bullet" key={i}>{line.replace(/^[-•o]\s*/, "")}</p> : <p key={i}>{line}</p>);
}

export default function Documents() {
  const [active, setActive] = useState(0);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [withPassenger, setWithPassenger] = useState(false);
  const [message, setMessage] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const doc = all[active];
  const value = entries[doc.id] || empty();
  const list = withPassenger ? all : policyDocuments;
  function update(patch: Partial<Entry>) {
    setEntries(e => ({ ...e, [doc.id]: { ...(e[doc.id] || empty()), ...patch, reviewed: false } }));
    setMessage("");
  }
  function go(index: number) {
    setActive(index); setMessage("");
    requestAnimationFrame(() => { heading.current?.focus(); heading.current?.scrollIntoView({ block: "start", behavior: "smooth" }); });
  }
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (Object.keys(entries).length) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [entries]);
  useEffect(() => {
    if (value.mode !== "draw" || !canvas.current) return;
    const c = canvas.current;
    c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    if (value.ink) { const image = new Image(); image.onload = () => c.getContext("2d")?.drawImage(image, 0, 0); image.src = value.ink; }
  }, [active, value.mode, value.ink]);
  function point(event: PointerEvent<HTMLCanvasElement>) {
    const c = event.currentTarget, rect = c.getBoundingClientRect();
    return [(event.clientX - rect.left) * c.width / rect.width, (event.clientY - rect.top) * c.height / rect.height];
  }
  function start(event: PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0) return;
    drawing.current = true; event.currentTarget.setPointerCapture(event.pointerId);
    const ctx = event.currentTarget.getContext("2d")!, [x, y] = point(event);
    ctx.lineWidth = 3; ctx.strokeStyle = "#14283f"; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x + .2,y + .2); ctx.stroke();
  }
  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const [x,y] = point(event), ctx = event.currentTarget.getContext("2d")!;
    ctx.lineTo(x,y); ctx.stroke();
  }
  function finish(event: PointerEvent<HTMLCanvasElement>) {
    if (drawing.current) { drawing.current = false; update({ ink: event.currentTarget.toDataURL("image/png") }); }
  }
  const completed = list.filter(d => entries[d.id]?.reviewed).length;
  return <main className="documents-shell">
    <div className="documents-preview">POLICY REVIEW PREVIEW <span>Use sample information. Nothing is submitted or saved after closing this page.</span></div>
    <div className="documents-layout">
      <aside className="documents-sidebar">
        <span className="documents-eyebrow">MOONTERA LLC · DRIVER ONBOARDING</span>
        <h1>Read. Review.<br />Get ready.</h1>
        <p>Review company safety and operational policies, one document at a time.</p>
        <div className="documents-progress"><span>{completed} of {list.length} reviewed</span><progress max={list.length} value={completed} /></div>
        <nav aria-label="Application documents">{list.map((d, i) => <button type="button" aria-current={active === i ? "step" : undefined} key={d.id} onClick={() => go(i)}><span>{entries[d.id]?.reviewed ? "✓" : String(i + 1).padStart(2,"0")}</span>{d.title}</button>)}</nav>
        <label className="document-check passenger-toggle"><input type="checkbox" checked={withPassenger} onChange={e => { setWithPassenger(e.target.checked); if (!e.target.checked && active === policyDocuments.length) go(0); }} />I plan to request a passenger</label>
        <div className="documents-help"><a href="mailto:info@moonterallc.com">info@moonterallc.com</a><a href="tel:+17738825595">773-882-5595</a><a href="/apply" target="_blank" rel="noreferrer">Open driver application ↗</a></div>
      </aside>
      <div className="documents-main">
        <div className="document-topline"><span>DOCUMENT {String(active + 1).padStart(2,"0")} / {String(list.length).padStart(2,"0")}</span><span>{doc.id === "passenger" ? "OPTIONAL REQUEST" : "INDIVIDUAL REVIEW"}</span></div>
        <h2 ref={heading} tabIndex={-1}>{doc.title}</h2>
        <p className="documents-intro">Read the full document below, then review your details and signature.</p>
        <article className="document-paper" aria-label={doc.title}>
          <div className="document-brand"><strong>MOONTERA LLC</strong><span>{doc.id === "psp" || doc.id === "mvr" ? "Disclosure & authorization" : "Driver onboarding"}</span></div>
          {doc.sections.map((section, i) => <section key={i}><h3>{section.title}</h3><Text body={section.body} /></section>)}
        </article>
        <form className="document-sign" onSubmit={e => {
          e.preventDefault();
          if (value.mode === "draw" && !value.ink) { setMessage("Please draw your signature, or choose Type name."); canvas.current?.focus(); return; }
          if (doc.id === "passenger" && value.end < value.start) { setMessage("The route end date must be on or after the start date."); return; }
          setEntries(entries => ({ ...entries, [doc.id]: { ...value, reviewed: true } }));
          setMessage(doc.id === "passenger" ? "Request preview complete. Company approval is still required. Nothing has been submitted." : "Review complete for this preview. No consent has been submitted and no report has been requested.");
        }}>
          <div className="document-sign-heading"><h3>{doc.id === "passenger" ? "Request details" : "Your acknowledgment"}</h3><span>PREVIEW ONLY</span></div>
          <div className="document-fields">
            <label>Full legal name<input required maxLength={120} autoComplete="name" value={value.name} onChange={e => update({ name: e.target.value })} /></label>
            <label>Driver’s license state<select required value={value.state} onChange={e => update({ state: e.target.value })}><option value="">Select state</option>{states.map(s => <option key={s}>{s}</option>)}</select></label>
            {doc.id === "passenger" && <>
              <label>Passenger’s full name<input required maxLength={120} value={value.passenger} onChange={e => update({ passenger:e.target.value })} /></label>
              <label>Vehicle VIN · last 6 characters<input required minLength={6} maxLength={6} pattern="[A-HJ-NPR-Z0-9]{6}" value={value.vin} onChange={e => update({ vin:e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g,"") })} /></label>
              <label>Route origin<input required value={value.origin} onChange={e => update({ origin:e.target.value })} /></label>
              <label>Route destination<input required value={value.destination} onChange={e => update({ destination:e.target.value })} /></label>
              <label>Route start date<input required type="date" value={value.start} onChange={e => update({ start:e.target.value })} /></label>
              <label>Route end date<input required type="date" min={value.start} value={value.end} onChange={e => update({ end:e.target.value })} /></label>
            </>}
          </div>
          {doc.id === "mvr" && <label className="document-check"><input type="checkbox" checked={value.copy} onChange={e => update({ copy:e.target.checked })} />I request a copy of my consumer report (applicants in CA, MN, MA, ME, and OK).</label>}
          <label className="document-check"><input required type="checkbox" checked={value.agreed} onChange={e => update({ agreed:e.target.checked })} />{doc.id === "passenger" ? "I understand that this request requires written company approval before a passenger may travel." : "I have read and reviewed this document."}</label>
          <fieldset className="document-signature"><legend>Signature preview</legend><div className="signature-options">{[["type","Type name"],["draw","Draw with finger"]].map(([mode,label]) => <label key={mode}><input type="radio" name="signature-mode" checked={value.mode === mode} onChange={() => update({ mode })} />{label}</label>)}</div>
          {value.mode === "type" ? <label>Type your full name<input required maxLength={120} className="typed-signature" value={value.signature} onChange={e => update({ signature:e.target.value })} /></label> : <><canvas ref={canvas} width={720} height={240} tabIndex={0} aria-label="Draw signature, or select Type name for keyboard entry" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} /><button type="button" className="document-clear" onClick={() => update({ ink:"" })}>Clear signature</button></>}
          </fieldset>
          <p className="document-note">This previews the signing experience. Verified signing and secure submission are not connected yet.</p>
          <button className="document-primary" type="submit">{value.reviewed ? "Review complete ✓" : "Complete preview review"}</button>
          {message && <p className="document-status" role="status">{message}</p>}
        </form>
        <div className="document-navigation"><button disabled={active === 0} onClick={() => go(active - 1)}>← Previous document</button>{active < list.length - 1 && <button onClick={() => go(active + 1)}>Next document →</button>}</div>
      </div>
    </div>
  </main>;
}
