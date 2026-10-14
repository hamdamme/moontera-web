"use client";
import { useRef, useState, type FormEvent } from "react";
import { quickFields, positions, cdlClasses, drugTestStatuses } from "@/lib/applications/model";
import { states } from "@/app/apply/schema";
import { formatPhone, formatZip, normalizeCdl } from "@/lib/applications/smart-fields";
import { submissionId } from "@/lib/applications/client";
import "../../apply/application.css";

export default function QuickApplication() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [receipt, setReceipt] = useState("");
  const [drugTestStatus, setDrugTestStatus] = useState("");
  const [phone, setPhone] = useState("");
  const [zip, setZip] = useState("");
  const [cdl, setCdl] = useState("");
  const [lastFour, setLastFour] = useState("");
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
        if (quick.drug_test_status !== "Date known") quick.drug_test_date = "";
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
              <a href="/drivers" className="apply-primary">
                Return to driver opportunities →
              </a>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="apply-card">
                <h2>Contact information</h2>
                <p className="apply-card-description">Provide your legal name, contact details, address, and availability.</p>
                <fieldset disabled={busy || !!pending.current} className="quick-fieldset">
                  <div className="apply-grid">
                    {quickFields.slice(0, 10).map((field) => (
                      <div className="apply-field" key={field.key}>
                        <label htmlFor={field.key}>{field.label} *</label>
                        {["position", "state"].includes(field.key) ? (
                          <select id={field.key} name={field.key} required defaultValue="">
                            <option value="">{field.key === "state" ? "Select state" : "Select position"}</option>
                            {(field.key === "state" ? states : positions).map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        ) : (
                          <input id={field.key} name={field.key} type={field.type} required maxLength={field.key === "email" ? 254 : field.key === "zip" ? 10 : field.key === "phone" ? 20 : 300}
                            value={field.key === "phone" ? phone : field.key === "zip" ? zip : undefined}
                            onChange={field.key === "phone" ? e => setPhone(formatPhone(e.target.value)) : field.key === "zip" ? e => setZip(formatZip(e.target.value)) : undefined}
                            inputMode={field.key === "phone" || field.key === "zip" ? "numeric" : undefined}
                            placeholder={field.key === "phone" ? "773-555-0123" : field.key === "zip" ? "60089" : undefined}
                            max={field.key === "dob" ? new Date().toISOString().slice(0, 10) : undefined}
                            autoComplete={field.key === "email" ? "email" : field.key === "phone" ? "tel-national" : field.key === "full_name" ? "name" : field.key === "address" ? "street-address" : field.key === "city" ? "address-level2" : field.key === "state" ? "address-level1" : field.key === "zip" ? "postal-code" : "off"} />
                        )}
                      </div>
                    ))}
                  </div>
                </fieldset>
              </div>
              <div className="apply-card">
                <h2>Commercial driver's license</h2>
                <p className="apply-card-description">Enter the details exactly as shown on your CDL.</p>
                <fieldset disabled={busy || !!pending.current} className="quick-fieldset">
                  <div className="apply-grid">
                    <div className="apply-field"><label htmlFor="cdl_number">CDL number *</label><input id="cdl_number" name="cdl_number" type="text" required maxLength={40} autoComplete="off" value={cdl} onChange={e => setCdl(normalizeCdl(e.target.value))} spellCheck={false} /></div>
                    <div className="apply-field"><label htmlFor="cdl_state">CDL issuing state *</label><select id="cdl_state" name="cdl_state" required defaultValue=""><option value="">Select state</option>{states.map(state => <option key={state} value={state}>{state}</option>)}</select></div>
                    <div className="apply-field"><label htmlFor="cdl_class">CDL class *</label><select id="cdl_class" name="cdl_class" required defaultValue=""><option value="">Select class</option>{cdlClasses.map(cdlClass => <option key={cdlClass} value={cdlClass}>{cdlClass}</option>)}</select></div>
                    <div className="apply-field"><label htmlFor="cdl_expiration">CDL expiration date *</label><input id="cdl_expiration" name="cdl_expiration" type="date" required /></div>
                  </div>
                </fieldset>
              </div>
              <div className="apply-card">
                <h2>DOT medical certification</h2>
                <fieldset disabled={busy || !!pending.current} className="quick-fieldset">
                  <div className="apply-grid">
                    <div className="apply-field"><label htmlFor="medical_card_issue">DOT medical card issue date *</label><input id="medical_card_issue" name="medical_card_issue" type="date" required max={new Date().toISOString().slice(0, 10)} /></div>
                    <div className="apply-field"><label htmlFor="medical_card_expiration">DOT medical card expiration date *</label><input id="medical_card_expiration" name="medical_card_expiration" type="date" required /></div>
                  </div>
                </fieldset>
              </div>
              <div className="apply-card">
                <h2>DOT drug testing history</h2>
                <p className="apply-card-description">When was your last DOT drug test? This information does not replace required pre-employment testing.</p>
                <fieldset disabled={busy || !!pending.current} className="quick-fieldset">
                  <div className="apply-grid">
                    <div className="apply-field"><label htmlFor="drug_test_status">Last DOT drug test *</label><select id="drug_test_status" name="drug_test_status" required value={drugTestStatus} onChange={e => setDrugTestStatus(e.target.value)}>
                      <option value="">Select an option</option>{drugTestStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                    </select></div>
                    {drugTestStatus === "Date known" && <div className="apply-field"><label htmlFor="drug_test_date">Date of last DOT drug test *</label><input id="drug_test_date" name="drug_test_date" type="date" max={new Date().toISOString().slice(0, 10)} required /></div>}
                  </div>
                </fieldset>
              </div>
              <div className="apply-card">
                <h2>Optional identification</h2>
                <p className="apply-card-description">You may leave this blank. Do not enter your full Social Security number.</p>
                <fieldset disabled={busy || !!pending.current} className="quick-fieldset">
                  <div className="apply-grid">
                    <div className="apply-field"><label htmlFor="ssn_last4">Last four digits of SSN (optional)</label><input id="ssn_last4" name="ssn_last4" type="text" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} autoComplete="off" value={lastFour} onChange={e => setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))} /></div>
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
