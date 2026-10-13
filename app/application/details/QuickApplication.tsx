"use client";
import { useRef, useState, type FormEvent } from "react";
import { quickFields, positions } from "@/lib/applications/model";
import { submissionId } from "@/lib/applications/client";
import "../../apply/application.css";

export default function QuickApplication() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [receipt, setReceipt] = useState("");
  const sending = useRef(false);
  const pending = useRef<Record<string, unknown> | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || receipt) return;
    sending.current = true;
    setBusy(true);
    setMessage("");
    try {
      if (!pending.current) {
        const data = new FormData(event.currentTarget);
        const quick = Object.fromEntries(
          quickFields.map((f) => [f.key, String(data.get(f.key) || "").trim()]),
        );
        pending.current = {
          quick,
          requestId: await submissionId("quick", quick.email),
        };
      }
      const response = await fetch("/api/application/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending.current),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        if (response.status === 400) pending.current = null;
        throw Error(result.message || "Submission failed. Please retry.");
      }
      setReceipt(result.id);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not connect. Please retry the same submission.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="apply-shell">
      <div className="apply-layout">
        <aside className="apply-sidebar">
          <div className="apply-eyebrow">DRIVE WITH MOONTERA</div>
          <h1>
            Quick
            <br />
            Application
          </h1>
          <p>
            Start with your contact details and the role you’re interested in.
            We’ll email you a confirmation after you apply.
          </p>
          <a
            className="apply-document-link"
            href="/apply/documents"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>Driver Documents &amp; Policies</span>
            <span aria-hidden="true">↗</span>
          </a>
          <div className="apply-help">
            <a href="tel:+17738825595">773-882-5595</a>
            <a href="mailto:info@moonterallc.com">info@moonterallc.com</a>
            <a href="/apply">Full Driver Application →</a>
          </div>
        </aside>
        <section className="apply-main">
          {receipt ? (
            <div className="apply-card">
              <h2>Application submitted</h2>
              <p>
                Thank you. Your Quick Application has been sent to Moontera LLC,
                and a confirmation email is on its way.
              </p>
              <p className="apply-card-description">Reference: {receipt}</p>
              <p>
                Please do not submit this application again. Contact us if you
                need to make a correction.
              </p>
              <a href="/apply" className="apply-primary">
                Continue to Full Driver Application →
              </a>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="apply-card">
                <h2>General information</h2>
                <p className="apply-card-description">
                  All fields are required. No Social Security number is
                  requested.
                </p>
                <fieldset
                  disabled={busy || !!pending.current}
                  style={{ border: 0, padding: 0, margin: 0 }}
                >
                  <div className="apply-grid">
                    {quickFields.map((field) => (
                      <div className="apply-field" key={field.key}>
                        <label htmlFor={field.key}>{field.label} *</label>
                        {field.type === "select" ? (
                          <select
                            id={field.key}
                            name={field.key}
                            required
                            defaultValue=""
                          >
                            <option value="">Select a position</option>
                            {positions.map((p) => (
                              <option key={p}>{p}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={field.key}
                            name={field.key}
                            type={field.type}
                            required
                            maxLength={field.type === "email" ? 254 : 300}
                            max={
                              field.key === "dob"
                                ? new Date().toISOString().slice(0, 10)
                                : undefined
                            }
                            autoComplete={
                              field.key === "email"
                                ? "email"
                                : field.key === "phone"
                                  ? "tel"
                                  : field.key === "full_name"
                                    ? "name"
                                    : undefined
                            }
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </fieldset>
              </div>
              {message && (
                <p className="apply-notice" role="alert">
                  {message}
                </p>
              )}
              <button className="apply-primary" type="submit" disabled={busy}>
                {busy
                  ? "Submitting…"
                  : pending.current
                    ? "Retry submission"
                    : "Submit Quick Application"}
              </button>
              <p className="apply-card-description">
                Your application goes directly to our team. You do not need to
                download or email a PDF.
              </p>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
