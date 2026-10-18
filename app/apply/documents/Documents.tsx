
"use client";

import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
import documents from "./documents.json";
import "./documents.css";

type Policy = (typeof documents)[number];
type Acknowledgments = { safety: boolean; cargo: boolean; accident: boolean };
type Invitation = { quickId: string; fullId: string; token: string };
const policies = documents.filter((item) => ["safety", "cargo", "accident"].includes(item.id)) as Policy[];

function Text({ body }: { body: string }) {
  const paragraphs: string[] = [];
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) { if (paragraphs.at(-1) !== "") paragraphs.push(""); continue; }
    const bullet = /^[-•]|^\d+\.|^o(?:police|witness|insurance|photos)/.test(line);
    if (bullet || !paragraphs.length || paragraphs.at(-1) === "" || /[.:]$/.test(paragraphs.at(-1) || "") || /^[-•]/.test(paragraphs.at(-1) || "")) paragraphs.push(line);
    else paragraphs[paragraphs.length - 1] += ` ${line}`;
  }
  return paragraphs.filter(Boolean).map((line, index) => /^[-•]|^o(?:police|witness|insurance|photos)/.test(line)
    ? <p className="doc-bullet" key={index}>{line.replace(/^[-•o]\s*/, "")}</p>
    : <p key={index}>{line}</p>);
}

export default function Documents() {
  const [invite, setInvite] = useState<Invitation | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [acknowledgments, setAcknowledgments] = useState<Acknowledgments>({ safety: false, cargo: false, accident: false });
  const [mode, setMode] = useState<"type" | "draw">("type");
  const [ink, setInk] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [linkValid, setLinkValid] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [deliveryPending, setDeliveryPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [active, setActive] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const doc = policies[active];
  const allAcknowledged = Object.values(acknowledgments).every(Boolean);

  useEffect(() => {
    Promise.resolve().then(() => {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const quickId = params.get("quickId") || "";
      const fullId = params.get("fullId") || "";
      const token = params.get("token") || "";
      if (!quickId || !fullId || !token) { setLoaded(true); return null; }
      const current = { quickId, fullId, token };
      setInvite(current);
      const search = new URLSearchParams({ quickId, fullId });
      return fetch(`/api/policy-consents?${search.toString()}`, { cache: "no-store", headers: { "x-policy-token": token } });
    }).then(async (response) => {
        if (!response) return null;
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "The secure policy link could not be opened.");
        setName(result.name || ""); setEmail(result.email || "");
        setLinkValid(true);
        setCompleted(!!result.completed); setDeliveryPending(!!result.deliveryPending);
        if (result.completed) setMessage(`Your policies were signed on ${new Date(result.signedAt).toLocaleString()}. A PDF copy was emailed to you.`);
        else if (result.deliveryPending) {
          setAcknowledgments({ safety: true, cargo: true, accident: true });
          setMessage("Your signed policies are saved. Retry email delivery below to send the copies.");
        }
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "The secure policy link could not be opened."))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (mode !== "draw" || !canvas.current) return;
    const context = canvas.current.getContext("2d");
    context?.clearRect(0, 0, canvas.current.width, canvas.current.height);
    if (ink) { const image = new Image(); image.onload = () => context?.drawImage(image, 0, 0); image.src = ink; }
  }, [mode, ink]);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    return [(event.clientX - rect.left) * element.width / rect.width, (event.clientY - rect.top) * element.height / rect.height];
  }
  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0) return;
    drawing.current = true; event.currentTarget.setPointerCapture(event.pointerId);
    const [x, y] = point(event); const context = event.currentTarget.getContext("2d");
    if (!context) return;
    context.lineWidth = 3; context.strokeStyle = "#14283f"; context.lineCap = "round"; context.beginPath(); context.moveTo(x, y); context.lineTo(x + 0.2, y + 0.2); context.stroke();
  }
  function moveDrawing(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const [x, y] = point(event); const context = event.currentTarget.getContext("2d");
    if (context) { context.lineTo(x, y); context.stroke(); }
  }
  function finishDrawing(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    drawing.current = false; setInk(event.currentTarget.toDataURL("image/png")); setMessage("");
  }
  function go(index: number) {
    setActive(index); requestAnimationFrame(() => { heading.current?.focus(); heading.current?.scrollIntoView({ block: "start", behavior: "smooth" }); });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invite || !allAcknowledged) { setMessage("Please review and acknowledge each policy before signing."); return; }
    if (mode === "draw" && !ink) { setMessage("Draw your signature below, or choose Type name."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/policy-consents", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...invite, requestId: crypto.randomUUID(), name, mode, ...(mode === "draw" ? { signatureImage: ink } : {}), acknowledgements: acknowledgments }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) { setDeliveryPending(!!result.saved); throw new Error(result.message || "Your policies could not be submitted. Please retry."); }
      setCompleted(true); setDeliveryPending(false);
      setMessage(`Your policies were signed on ${new Date(result.signedAt).toLocaleString()}. A PDF copy was emailed to you.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Your policies could not be submitted. Please retry."); }
    finally { setBusy(false); }
  }

  if (!loaded) return <main className="documents-shell"><div className="documents-loading">Loading your secure policy packet…</div></main>;
  if (!invite || !linkValid) return <main className="documents-shell"><div className="documents-link-required"><span className="documents-eyebrow">MOONTERA LLC · DRIVER ONBOARDING</span><h1>Driver policies</h1><p>{message || "Use the secure link sent to your email after your Full Application is submitted. If you need a new link, contact info@moonterallc.com."}</p><a href="mailto:info@moonterallc.com">info@moonterallc.com</a></div></main>;

  return <main className="documents-shell">
    <div className="documents-preview">MOONTERA LLC · DRIVER POLICIES <span>Read the three policies and acknowledge each one.</span></div>
    <div className="documents-layout">
      <aside className="documents-sidebar">
        <span className="documents-eyebrow">SECURE DRIVER ONBOARDING</span>
        <h1>Review your<br />policies.</h1>
        <p>Read each policy, then sign once. You will receive the signed PDF by email.</p>
        <p className="documents-applicant">{name}<br /><span>{email}</span></p>
        <div className="documents-progress"><span>{Object.values(acknowledgments).filter(Boolean).length} of 3 acknowledged</span><progress max={3} value={Object.values(acknowledgments).filter(Boolean).length} /></div>
        <nav aria-label="Driver policies">{policies.map((item, index) => <button type="button" aria-current={active === index ? "step" : undefined} key={item.id} onClick={() => go(index)}><span>{acknowledgments[item.id as keyof Acknowledgments] ? "✓" : String(index + 1).padStart(2, "0")}</span>{item.title}</button>)}</nav>
        <div className="documents-help"><a href="mailto:info@moonterallc.com">info@moonterallc.com</a><a href="tel:+17738825595">773-882-5595</a></div>
      </aside>
      <div className="documents-main">
        {completed ? <section className="document-complete"><span className="documents-eyebrow">SIGNING COMPLETE</span><h2>Thank you, {name}.</h2><p>{message}</p><p>Your PDF copy contains all three policies and the name and date for each acknowledgment.</p></section> : <>
          <div className="document-topline"><span>POLICY {String(active + 1).padStart(2, "0")} / 03</span><span>READ AND ACKNOWLEDGE</span></div>
          <h2 ref={heading} tabIndex={-1}>{doc.title}</h2>
          <p className="documents-intro">Read the policy below. Your progress stays saved in this page while you move between the three documents.</p>
          <article className="document-paper" aria-label={doc.title}>
            <div className="document-brand"><strong>MOONTERA LLC</strong><span>Driver onboarding</span></div>
            {doc.sections.map((section, index) => <section key={index}><h3>{section.title}</h3><Text body={section.body} /></section>)}
          </article>
          <label className="document-check"><input type="checkbox" checked={acknowledgments[doc.id as keyof Acknowledgments]} onChange={(event) => setAcknowledgments((current) => ({ ...current, [doc.id]: event.target.checked }))} />I have read and reviewed the {doc.title}.</label>
          <div className="document-navigation"><button disabled={active === 0} onClick={() => go(active - 1)}>← Previous policy</button>{active < policies.length - 1 ? <button onClick={() => go(active + 1)}>Next policy →</button> : null}</div>
          <form className="document-sign" onSubmit={submit}>
            <div className="document-sign-heading"><h3>{deliveryPending ? "Finish email delivery" : "Sign and complete"}</h3><span>SECURE SUBMISSION</span></div>
            <div className="document-fields"><label>Full legal name<input required maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} readOnly /></label><label>Email address<input value={email} readOnly /></label></div>
            <fieldset className="document-signature"><legend>Signature</legend><div className="signature-options"><label><input type="radio" name="signature-mode" checked={mode === "type"} onChange={() => setMode("type")} />Type name</label><label><input type="radio" name="signature-mode" checked={mode === "draw"} onChange={() => setMode("draw")} />Draw with finger</label></div>
              {mode === "type" ? <label>Type your full legal name<input required maxLength={120} className="typed-signature" value={name} onChange={(event) => setName(event.target.value)} /></label> : <><canvas ref={canvas} width={720} height={240} tabIndex={0} aria-label="Draw signature" onPointerDown={startDrawing} onPointerMove={moveDrawing} onPointerUp={finishDrawing} onPointerCancel={finishDrawing} /><button type="button" className="document-clear" onClick={() => { setInk(""); canvas.current?.getContext("2d")?.clearRect(0, 0, 720, 240); }}>Clear signature</button></>}
            </fieldset>
            <p className="document-note">By selecting the button, you confirm that you reviewed the policies and electronically signed them. The signed PDF will be emailed to you and Moontera.</p>
            <button className="document-primary" type="submit" disabled={busy || !allAcknowledged}>{busy ? "Sending signed copies…" : deliveryPending ? "Retry email delivery" : "Sign and complete policies"}</button>
            {message && <p className="document-status" role="status">{message}</p>}
          </form>
        </>}
      </div>
    </div>
  </main>;
}
