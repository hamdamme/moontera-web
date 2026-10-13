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
export default function Application() {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [signatureMode, setSignatureMode] = useState("type");
  const [signatureName, setSignatureName] = useState("");
  const [signatureImage, setSignatureImage] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showSsn, setShowSsn] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const title = useRef<HTMLHeadingElement>(null);
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
    if (f.type === "yesno")
      return (
        <fieldset className="apply-question" key={id}>
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
                  aria-invalid={!!error}
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
              type={
                f.type === "ssn"
                  ? showSsn
                    ? "text"
                    : "password"
                  : f.type === "email"
                    ? "email"
                    : "text"
              }
              inputMode={
                ["ssn", "phone", "number", "date", "month"].includes(
                  f.type || "",
                ) || f.key === "zip"
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
                    : f.type === "ssn"
                      ? 11
                      : f.type === "phone"
                        ? 12
                        : f.key === "zip"
                          ? 10
                          : 250
              }
              autoComplete={
                f.type === "ssn"
                  ? "off"
                  : f.type === "email"
                    ? "email"
                    : f.type === "phone"
                      ? "tel"
                      : undefined
              }
              placeholder={
                f.type === "date"
                  ? "MM/DD/YYYY"
                  : f.type === "month"
                    ? "MM/YYYY"
                    : f.type === "ssn"
                      ? "123-45-6789"
                      : f.type === "phone"
                        ? "773-555-0123"
                        : undefined
              }
            />
            {f.type === "ssn" && (
              <button
                type="button"
                className="apply-reveal"
                aria-label={
                  showSsn
                    ? "Hide Social Security number"
                    : "Show Social Security number"
                }
                onClick={() => setShowSsn(!showSsn)}
              >
                {showSsn ? "Hide" : "Show"}
              </button>
            )}
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
  async function download() {
    setNotice("");
    for (let i = 0; i < steps.length; i++) {
      const e = validateStep(i, answers);
      if (Object.keys(e).length) {
        setStep(i);
        setErrors(e);
        setNotice(
          "Please complete the highlighted fields before creating your PDF.",
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
    setBusy(true);
    try {
      const [{ createApplicationPdf }, font] = await Promise.all([
        import("./pdf"),
        fetch("/fonts/Geist-Regular.ttf"),
      ]);
      if (!font.ok) throw Error("Font unavailable");
      const bytes = await createApplicationPdf(
        answers,
        {
          mode: signatureMode,
          name: signatureName.trim(),
          image: signatureImage,
        },
        await font.arrayBuffer(),
      );
      const blob = new Blob([new Uint8Array(bytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Moontera-Driver-Application-Preview.pdf";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setNotice(
        "Your PDF was generated. It has not been submitted to Moontera.",
      );
    } catch {
      setNotice(
        "We could not generate the PDF. Your answers are still here. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  const current = steps[step];
  return (
    <main className="apply-shell">
      <div className="apply-preview">
        <span className="apply-dot" /> APPLICATION PREVIEW{" "}
        <span>Use sample information. Nothing is submitted.</span>
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
                    disabled={i > step}
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
              {current?.heading || "Review. Sign. Download."}
            </h2>
            <p>
              {current?.description ||
                "Check your answers before generating your application preview."}
            </p>
          </header>
          <div className="apply-session">
            Your answers stay in this tab only. Closing or refreshing it clears
            your progress.
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
                  {answers[g.key].map((row, i) => (
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
                              onClick={() => {
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
                      className="apply-add"
                      type="button"
                      onClick={() => {
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
                      onClick={() => go(i)}
                    >
                      Edit {s.title.toLowerCase()}
                    </button>
                  </div>
                  {s.groups.map((g) => (
                    <div className="apply-review-group" key={g.key}>
                      <h4>{g.title}</h4>
                      {!answers[g.key].length ? (
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
                                    {f.type === "ssn" && row[f.key]
                                      ? `•••-••-${row[f.key].slice(-4)}`
                                      : row[f.key] || "Not provided"}
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
                  Review MVR and PSP authorizations, company policies, and an optional
                  passenger request. Each document has its own signature preview.
                  This preview does not authorize or request background reports.
                </p>
              </section>
              <section className="apply-card">
                <a href="/apply/documents" target="_blank" rel="noreferrer" style={{ color: "#2364df", fontWeight: 700 }}>Review authorizations & policies ↗</a>
                <p className="apply-card-description">Opens in a new tab so your application answers stay here.</p>
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
                  Signature preview only. Verified electronic signing and a
                  signing audit trail are not connected yet.
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
                  onClick={download}
                >
                  {busy ? "Creating PDF…" : "Download application PDF"}{" "}
                  <span>↓</span>
                </button>
              </div>
              <p className="apply-download-note">
                Downloads to your device. This does not submit an application.
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
