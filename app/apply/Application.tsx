
"use client";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
} from "react";
import {
  steps,
  initialAnswers,
  visible,
  path,
  formatValue,
  validateStep,
  certification,
  type Field,
  type Answers,
} from "./schema";
import "./application.css";
import { submissionId } from "@/lib/applications/client";
export default function Application() {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [receipt, setReceipt] = useState("");
  const [hasFullOnFile, setHasFullOnFile] = useState(false);
  const [revisionNumber, setRevisionNumber] = useState(0);
  const [pendingSubmission, setPendingSubmission] = useState(false);
  const [gateLoading, setGateLoading] = useState(true);
  const [fullAccess, setFullAccess] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [gateMessage, setGateMessage] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [saveNonce, setSaveNonce] = useState(0);
  const sending = useRef(false);
  const pending = useRef<Record<string, unknown> | null>(null);
  const draftVersion = useRef<string | null>(null);
  const draftEditVersion = useRef(0);
  const draftSaving = useRef(false);
  const [signatureMode, setSignatureMode] = useState("type");
  const [signatureName, setSignatureName] = useState("");
  const [signatureImage, setSignatureImage] = useState("");
  const [agreed, setAgreed] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    let active = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
    if (token) window.history.replaceState(null, "", "/apply");
    async function resume() {
      try {
        if (token) {
          const access = await fetch("/api/application/full/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
            cache: "no-store",
          });
          if (!access.ok) throw new Error("This invitation is invalid or expired.");
        }
        const response = await fetch("/api/application/full/session", { cache: "no-store" });
        if (response.ok) {
          const result = await response.json();
          if (active) {
            setAnswers(result.answers);
            setVerifiedEmail(result.verifiedEmail);
            setHasFullOnFile(!!result.onFile);
            setRevisionNumber(result.revisionNumber || 0);
            if (result.onFile) setReceipt(result.latestId || "submitted");
            draftVersion.current = result.draftVersion || null;
            setDraftStatus(result.draftSavedAt ? `Draft restored from ${new Date(result.draftSavedAt).toLocaleString()}.` : "");
            setFullAccess(true);
          }
        } else if (active) {
          setGateMessage("A current Full Application invitation is required to continue.");
        }
      } catch {
        if (active) setGateMessage("This invitation could not be opened. Reopen the link from Moontera’s email or contact info@moonterallc.com.");
      } finally {
        if (active) setGateLoading(false);
      }
    }
    void resume();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!fullAccess || !dirty || pendingSubmission) return;
    const timer = window.setTimeout(async () => {
      if (draftSaving.current) return;
      draftSaving.current = true;
      const editVersionAtStart = draftEditVersion.current;
      setDraftStatus("Saving your private draft…");
      try {
        const response = await fetch("/api/application/full/draft", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers, version: draftVersion.current }),
        });
        const result = await response.json();
        if (response.status === 409) {
          const refreshedResponse = await fetch("/api/application/full/session", { cache: "no-store" });
          const refreshed = await refreshedResponse.json();
          if (refreshedResponse.ok) {
            draftVersion.current = refreshed.draftVersion || null;
            setDraftStatus("Saving your latest answers…");
            setSaveNonce((nonce) => nonce + 1);
            return;
          }
        }
        if (response.status === 401) {
          setFullAccess(false);
          setGateMessage("Your verified session expired. Reopen your secure invitation to continue; your saved draft is retained.");
          setDraftStatus("Draft saved previously. Sign in again to continue.");
          return;
        }
        if (!response.ok) throw new Error(result.message || "Draft could not be saved.");
        draftVersion.current = result.version;
        if (draftEditVersion.current === editVersionAtStart) {
          setDirty(false);
          setDraftStatus(`Draft saved at ${new Date(result.savedAt).toLocaleTimeString()}.`);
        } else {
          setDraftStatus("Saving your latest answers…");
          setSaveNonce((nonce) => nonce + 1);
        }
      } catch (error) {
        setDraftStatus(error instanceof Error ? `Draft not saved: ${error.message}` : "Draft not saved. Keep this tab open and retry.");
      } finally {
        draftSaving.current = false;
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [answers, dirty, fullAccess, pendingSubmission, saveNonce]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (
      signatureMode === "draw" &&
      step === steps.length &&
      signatureImage &&
      canvas.current
    ) {
      const image = new Image();
      image.onload = () => {
        const c = canvas.current;
        if (c) c.getContext("2d")?.drawImage(image, 0, 0, c.width, c.height);
      };
      image.src = signatureImage;
    }
  }, [signatureMode, step, signatureImage]);
  function go(n: number) {
    setStep(n);
    setErrors({});
    setNotice("");
    requestAnimationFrame(() => {
      title.current?.focus();
      title.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  function update(group: string, index: number, field: Field, value: string) {
    if (pending.current || !fullAccess) return;
    pending.current = null;
    draftEditVersion.current += 1;
    setDirty(true);
    setAnswers((a) => ({
      ...a,
      [group]: a[group].map((row, i) =>
        i === index ? { ...row, [field.key]: formatValue(field, value) } : row,
      ),
    }));
    setErrors((e) => {
      const n = { ...e };
      delete n[path(group, index, field.key)];
      return n;
    });
  }
  function next(e: FormEvent) {
    e.preventDefault();
    const e2 = validateStep(step, answers);
    setErrors(e2);
    if (Object.keys(e2).length) {
      requestAnimationFrame(() =>
        document.getElementById(Object.keys(e2)[0])?.focus(),
      );
      return;
    }
    go(step + 1);
  }
  function control(
    f: Field,
    g: string,
    i: number,
    row: Record<string, string>,
  ) {
    const id = path(g, i, f.key),
      value = row[f.key] || "",
      error = errors[id];
    const props = {
      id,
      disabled: busy || pendingSubmission,
      value,
      onChange: (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
      ) => update(g, i, f, e.target.value),
      "aria-invalid": !!error,
      "aria-describedby": error
        ? `${id}-error`
        : f.hint
          ? `${id}-hint`
          : undefined,
    };
    if (f.type === "checkbox")
      return (
        <label className="apply-table-checkbox" htmlFor={id}>
          <input
            {...props}
            type="checkbox"
            checked={value === "Yes"}
            onChange={(e) => update(g, i, f, e.target.checked ? "Yes" : "No")}
          />
          {f.label}
        </label>
      );
    if (f.type === "yesno")
      return (
        <fieldset
          className="apply-question"
          key={id}
          disabled={busy || pendingSubmission}
        >
          <legend>
            {f.label}
            {f.required && <span aria-label="required"> *</span>}
          </legend>
          <div className="apply-choices">
            {["Yes", "No"].map((v, j) => (
              <label key={v} className={value === v ? "chosen" : ""}>
                <input
                  id={j === 0 ? id : undefined}
                  type="radio"
                  name={id}
                  value={v}
                  checked={value === v}
                  onChange={() => update(g, i, f, v)}
                  aria-describedby={error ? `${id}-error` : undefined}
                />
                {v}
              </label>
            ))}
          </div>
          {error && (
            <span className="apply-error" id={`${id}-error`}>
              {error}
            </span>
          )}
        </fieldset>
      );
    return (
      <div
        className={`apply-field ${f.type === "textarea" ? "wide" : ""}`}
        key={id}
      >
        <label htmlFor={id}>
          {f.label}
          {f.type === "date"
            ? " (MM/DD/YYYY)"
            : f.type === "month"
              ? " (MM/YYYY)"
              : ""}
          {f.required ? (
            <span aria-label="required"> *</span>
          ) : (
            <small>Optional</small>
          )}
        </label>
        {f.type === "select" ? (
          <select {...props}>
            <option value="">Select an option</option>
            {f.options?.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        ) : f.type === "textarea" ? (
          <textarea {...props} rows={3} maxLength={4000} />
        ) : (
          <div className="apply-input-wrap">
            <input
              {...props}
              type={f.type === "email" ? "email" : "text"}
              readOnly={f.readOnly}
              inputMode={
                ["phone", "number", "date", "month"].includes(
                  f.type || "",
                ) || f.key === "zip" || f.key === "ssn"
                  ? "numeric"
                  : f.type === "email"
                    ? "email"
                    : "text"
              }
              maxLength={
                f.type === "date"
                  ? 10
                  : f.type === "month"
                    ? 7
                        : f.type === "phone"
                          ? 12
                          : f.key === "ssn"
                            ? 11
                        : f.key === "zip"
                          ? 10
                          : 250
              }
              autoComplete={
                f.type === "email"
                  ? "email"
                  : f.type === "phone"
                    ? "tel"
                    : f.key === "ssn"
                      ? "off"
                    : undefined
              }
              placeholder={
                f.type === "date"
                  ? "MM/DD/YYYY"
                  : f.type === "month"
                    ? "MM/YYYY"
                  : f.type === "phone"
                      ? "773-555-0123"
                      : f.key === "ssn"
                        ? "000-00-0000"
                        : undefined
              }
            />
          </div>
        )}
        {f.hint && <small id={`${id}-hint`}>{f.hint}</small>}
        {error && (
          <span className="apply-error" id={`${id}-error`}>
            {error}
          </span>
        )}
      </div>
    );
  }
  function pointer(e: PointerEvent<HTMLCanvasElement>) {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    const rect = c.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * c.width) / rect.width,
      y = ((e.clientY - rect.top) * c.height) / rect.height;
    if (e.type === "pointerdown") {
      drawing.current = true;
      c.setPointerCapture(e.pointerId);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.1, y + 0.1);
      ctx.strokeStyle = "#14283f";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.stroke();
      setDirty(true);
    } else if (e.type === "pointermove" && drawing.current) {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (drawing.current) {
      drawing.current = false;
      setSignatureImage(c.toDataURL("image/png"));
    }
  }
  async function submitApplication() {
    if (sending.current || receipt || !fullAccess) return;
    setNotice("");
    for (let i = 0; i < steps.length; i++) {
      const e = validateStep(i, answers);
      if (Object.keys(e).length) {
        setStep(i);
        setErrors(e);
        setNotice(
          "Please complete the highlighted fields before submitting your application.",
        );
        return;
      }
    }
    if (
      !agreed ||
      !signatureName.trim() ||
      (signatureMode === "draw" && !signatureImage)
    ) {
      setNotice(
        "Confirm the certification, enter your printed name, and provide your signature.",
      );
      return;
    }
    sending.current = true;
    setBusy(true);
    try {
      if (!pending.current)
        pending.current = {
          answers,
          signature: {
            mode: signatureMode,
            name: signatureName.trim(),
            image: signatureImage,
          },
          certified: agreed,
          requestId: hasFullOnFile
            ? crypto.randomUUID()
            : await submissionId("full", answers.personal[0].email),
        };
      setPendingSubmission(true);
      const response = await fetch(hasFullOnFile ? "/api/application/full/revision" : "/api/application/full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending.current),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        if (response.status === 400 || response.status === 409) {
          pending.current = null;
          setPendingSubmission(false);
        }
        throw Error(
          result.message || "Could not submit your application. Please retry.",
        );
      }
      setDirty(false);
      setHasFullOnFile(true);
      setRevisionNumber(result.revisionNumber || 0);
      pending.current = null;
      setReceipt(result.id);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not connect. Please retry the same submission.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  if (gateLoading)
    return (
      <main className="apply-shell" style={{ padding: "64px 24px" }}>
        <section className="apply-card" style={{ maxWidth: 620, margin: "auto" }}>
          <h1>Checking your invitation</h1>
          <p className="apply-card-description">We are verifying secure access to the Full Driver Application.</p>
        </section>
      </main>
    );
  if (!fullAccess)
    return (
      <main className="apply-shell" style={{ padding: "64px 24px" }}>
        <section className="apply-card" style={{ maxWidth: 620, margin: "auto" }}>
          <p className="apply-eyebrow">MOONTERA LLC</p>
          <h1>Full Driver Application</h1>
          <p className="apply-card-description">{gateMessage}</p>
          {gateMessage && <p className="apply-notice" role="status">{gateMessage}</p>}
          <p className="apply-card-description">Need a valid invitation? Contact <a href="mailto:info@moonterallc.com">info@moonterallc.com</a>.</p>
        </section>
      </main>
    );
  if (receipt)
    return (
      <main className="apply-shell" style={{ padding: "64px 24px" }}>
        <section
          className="apply-card"
          style={{ maxWidth: 700, margin: "auto" }}
        >
          <h1>Application submitted</h1>
          <p>
            Thank you. Your Full Driver Application has been sent to Moontera
            LLC. A confirmation email is on its way.
          </p>
          <p className="apply-card-description">Reference: {receipt}</p>
          {hasFullOnFile ? (
            <>
              {revisionNumber > 0 && <p className="apply-card-description">Latest signed revision: {revisionNumber}</p>}
              <p>To correct information, edit the saved application and sign the updated version. Your changes remain a draft until you reconfirm your signature.</p>
              <button className="apply-primary" type="button" onClick={() => {
                setReceipt("");
                setStep(0);
                setAgreed(false);
                setSignatureName("");
                setSignatureImage("");
                setSignatureMode("type");
                setPendingSubmission(false);
                pending.current = null;
                setNotice("");
              }}>Edit application</button>
            </>
          ) : (
            <p>Please do not apply again. For corrections, contact <a href="mailto:info@moonterallc.com">info@moonterallc.com</a>.</p>
          )}
          <a href="/drivers" className="apply-primary">
            Return to driver opportunities
          </a>
        </section>
      </main>
    );
  const current = steps[step];
  return (
    <main className="apply-shell">
      <div className="apply-preview">
        <span className="apply-dot" /> DRIVER APPLICATION{" "}
        <span>Submit once. Receive your confirmation by email.</span>
      </div>
      <div className="apply-layout">
        <aside className="apply-sidebar">
          <div className="apply-eyebrow">FULL DRIVER APPLICATION</div>
          <h1>
            A better road
            <br />
            starts here.
          </h1>
          <p>
            One application.
            <br />
            Your next opportunity.
          </p>
          <nav aria-label="Application progress">
            <ol>
              {[...steps.map((s) => s.title), "Review & sign"].map((s, i) => (
                <li key={s}>
                  <button
                    type="button"
                    disabled={i > step || busy || pendingSubmission}
                    aria-current={step === i ? "step" : undefined}
                    className={
                      step === i ? "active" : i < step ? "complete" : ""
                    }
                    onClick={() => go(i)}
                  >
                    <span>
                      {i < step ? "✓" : String(i + 1).padStart(2, "0")}
                    </span>
                    {s}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <div className="apply-help">
            <b>Need a hand?</b>
            <a href="tel:+17738825595">773-882-5595 ↗</a>
            <a href="mailto:info@moonterallc.com">info@moonterallc.com</a>
          </div>
          <div className="apply-road" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </aside>
        <section className="apply-main">
          <div className="apply-topline">
            <span>DRIVER APPLICATION</span>
            <span>Step {step + 1} of 6</span>
          </div>
          <div
            className="apply-progress"
            role="progressbar"
            aria-label="Application progress"
            aria-valuenow={step + 1}
            aria-valuemin={0}
            aria-valuemax={6}
          >
            <span style={{ width: `${((step + 1) / 6) * 100}%` }} />
          </div>
          <header className="apply-heading">
            <h2 ref={title} tabIndex={-1}>
              {current?.heading || "Review. Sign. Submit."}
            </h2>
            <p>
              {current?.description ||
                "Check your answers and submit your application to our team."}
            </p>
          </header>
          <div className="apply-session">
            Verified email: {verifiedEmail}. Your incomplete answers save privately as you work.
            {draftStatus && <span aria-live="polite"> {draftStatus}</span>}
            {dirty && draftStatus.startsWith("Draft not saved") && (
              <button className="apply-link" type="button" onClick={() => setSaveNonce((value) => value + 1)}>Retry draft save</button>
            )}
          </div>
          {notice && (
            <div className="apply-notice" role="status">
              {notice}
            </div>
          )}
          {step < steps.length ? (
            <form noValidate onSubmit={next}>
              <p className="apply-required">Fields marked * are required.</p>
              {Object.keys(errors).length > 0 && (
                <div className="apply-error-summary" role="alert">
                  Please check the highlighted fields below.
                </div>
              )}
              {current.groups.map((g) => (
                <section key={g.key} className="apply-card">
                  <div className="apply-card-title">
                    <h3>{g.title}</h3>
                    {g.repeat && <span>{answers[g.key].length} added</span>}
                  </div>
                  {g.description && (
                    <p className="apply-card-description">{g.description}</p>
                  )}
                  {!answers[g.key].length && (
                    <div className="apply-empty">No entries added yet.</div>
                  )}
                  {g.fixedRows ? (
                    <div className="apply-experience-table" role="table" aria-label="Driving experience">
                      <div className="apply-experience-header" role="row">
                        {[
                          "Equipment Type",
                          "From (MM/YYYY)",
                          "To (MM/YYYY)",
                          "Approximate Miles",
                        ].map((label) => (
                          <span role="columnheader" key={label}>{label}</span>
                        ))}
                      </div>
                      {answers[g.key].map((row, i) => (
                        <div className="apply-experience-data" role="row" key={`${g.key}-${i}`}>
                          <div role="rowheader" className="apply-experience-type">
                            <strong>{row.equipment}</strong>
                            {control(g.fields[0], g.key, i, row)}
                            {row.equipment === "Other" && row.selected === "Yes" &&
                              control(g.fields[4], g.key, i, row)}
                          </div>
                          {g.fields.slice(1, 4).map((field) => (
                            <div role="cell" key={field.key}>
                              {visible(field, row) ? (
                                <div data-label={field.label}>{control(field, g.key, i, row)}</div>
                              ) : <span aria-hidden="true">—</span>}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : answers[g.key].map((row, i) => (
                    <div
                      className={g.repeat ? "apply-record" : ""}
                      key={`${g.key}-${i}`}
                    >
                      {g.repeat && (
                        <div className="apply-record-title">
                          <b>
                            {g.item} {i + 1}
                          </b>
                          {answers[g.key].length > (g.minimum || 0) && (
                            <button
                              type="button"
                              className="apply-link"
                              disabled={busy || pendingSubmission}
                              onClick={() => {
                                draftEditVersion.current += 1;
                                setAnswers((a) => ({
                                  ...a,
                                  [g.key]: a[g.key].filter((_, n) => n !== i),
                                }));
                                setErrors({});
                                setDirty(true);
                              }}
                            >
                              Remove {g.item} {i + 1}
                            </button>
                          )}
                        </div>
                      )}
                      <div className="apply-grid">
                        {g.fields
                          .filter((f) => visible(f, row))
                          .map((f) => control(f, g.key, i, row))}
                      </div>
                    </div>
                  ))}
                  {g.repeat && (
                    <button
                      disabled={busy || pendingSubmission}
                      className="apply-add"
                      type="button"
                      onClick={() => {
                        draftEditVersion.current += 1;
                        setAnswers((a) => ({
                          ...a,
                          [g.key]: [...a[g.key], {}],
                        }));
                        setDirty(true);
                      }}
                    >
                      ＋ Add {g.item}
                    </button>
                  )}
                </section>
              ))}
              <div className="apply-actions">
                <button
                  type="button"
                  className="apply-back"
                  disabled={step === 0}
                  onClick={() => go(step - 1)}
                >
                  ← Back
                </button>
                <button className="apply-primary" type="submit">
                  {step === 4 ? "Review application" : "Continue"}{" "}
                  <span>→</span>
                </button>
              </div>
            </form>
          ) : (
            <>
              {steps.map((s, i) => (
                <section className="apply-card" key={s.title}>
                  <div className="apply-card-title">
                    <h3>{s.title}</h3>
                    <button
                      className="apply-link"
                      type="button"
                      disabled={busy || pendingSubmission}
                      onClick={() => go(i)}
                    >
                      Edit {s.title.toLowerCase()}
                    </button>
                  </div>
                  {s.groups.map((g) => (
                    <div className="apply-review-group" key={g.key}>
                      <h4>{g.title}</h4>
                      {g.fixedRows ? (
                        answers[g.key].some((row) => row.selected === "Yes") ? (
                          answers[g.key]
                            .filter((row) => row.selected === "Yes")
                            .map((row, index) => (
                              <dl className="apply-review-list" key={`${row.equipment}-${index}`}>
                                <div><dt>Equipment Type</dt><dd>{row.equipment}</dd></div>
                                <div><dt>From</dt><dd>{row.from}</dd></div>
                                <div><dt>To</dt><dd>{row.to}</dd></div>
                                <div><dt>Approximate Miles</dt><dd>{row.miles}</dd></div>
                                {row.equipment === "Other" && (
                                  <div className="wide"><dt>Other Equipment</dt><dd>{row.other}</dd></div>
                                )}
                              </dl>
                            ))
                        ) : <p>No driving experience selected</p>
                      ) : !answers[g.key].length ? (
                        <p>No records entered</p>
                      ) : (
                        answers[g.key].map((row, n) => (
                          <dl className="apply-review-list" key={n}>
                            {g.repeat && (
                              <div className="wide">
                                <dt>Record</dt>
                                <dd>{n + 1}</dd>
                              </div>
                            )}
                            {g.fields
                              .filter((f) => visible(f, row))
                              .map((f) => (
                                <div key={f.key}>
                                  <dt>{f.label}</dt>
                                  <dd>
                                    {row[f.key] || "Not provided"}
                                  </dd>
                                </div>
                              ))}
                          </dl>
                        ))
                      )}
                    </div>
                  ))}
                </section>
              ))}
              <section className="apply-card">
                <h3>Separate authorizations</h3>
                <p className="apply-card-description">
                  Review MVR and PSP authorizations, company policies, and an
                  optional passenger request. Each document has its own
                  signature preview. This preview does not authorize or request
                  background reports.
                </p>
              </section>
              <section className="apply-card">
                <a
                  href="/apply/documents"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#2364df", fontWeight: 700 }}
                >
                  Review authorizations & policies ↗
                </a>
                <p className="apply-card-description">
                  Opens in a new tab so your application answers stay here.
                </p>
              </section>
              <section className="apply-card">
                <h3>Applicant certification</h3>
                <p className="apply-card-description">{certification}</p>
                <label className="apply-agreement">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => {
                      setAgreed(e.target.checked);
                      setDirty(true);
                    }}
                  />
                  I have reviewed my answers and agree to the certification
                  above.
                </label>
                <div className="apply-field">
                  <label htmlFor="signatureName">Full legal name *</label>
                  <input
                    id="signatureName"
                    value={signatureName}
                    maxLength={150}
                    onChange={(e) => {
                      setSignatureName(e.target.value);
                      setDirty(true);
                    }}
                  />
                </div>
                <div
                  className="apply-sign-tabs"
                  role="group"
                  aria-label="Signature method"
                >
                  {["type", "draw"].map((mode) => (
                    <button
                      type="button"
                      aria-pressed={signatureMode === mode}
                      className={signatureMode === mode ? "selected" : ""}
                      onClick={() => setSignatureMode(mode)}
                      key={mode}
                    >
                      {mode === "type"
                        ? "Type your name"
                        : "Draw your signature"}
                    </button>
                  ))}
                </div>
                {signatureMode === "type" ? (
                  <div className="apply-signature-preview">
                    {signatureName || "Your signature"}
                  </div>
                ) : (
                  <>
                    <canvas
                      ref={canvas}
                      width={720}
                      height={360}
                      aria-label="Draw your signature using a finger or pointer; alternatively choose Type your name"
                      className="apply-canvas"
                      onPointerDown={pointer}
                      onPointerMove={pointer}
                      onPointerUp={pointer}
                      onPointerCancel={pointer}
                    />
                    <button
                      type="button"
                      className="apply-link"
                      onClick={() => {
                        canvas.current
                          ?.getContext("2d")
                          ?.clearRect(0, 0, 720, 360);
                        setSignatureImage("");
                      }}
                    >
                      Clear signature
                    </button>
                  </>
                )}
                <p className="apply-card-description">
                  By submitting, you adopt this typed or drawn signature as your
                  electronic signature for the application certification.
                  Separate background authorizations are completed
                  independently.
                </p>
              </section>
              <div className="apply-actions">
                <button
                  type="button"
                  className="apply-back"
                  onClick={() => go(4)}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  className="apply-primary"
                  disabled={busy}
                  onClick={submitApplication}
                >
                  {busy
                    ? "Submitting…"
                    : pendingSubmission
                      ? "Retry submission"
                      : "Submit Full Driver Application"}{" "}
                  <span>→</span>
                </button>
              </div>
              <p className="apply-download-note">
                Your application is sent directly to our team. We’ll email you a
                confirmation; no PDF download is required.
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
