"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import "./admin.css";
import "./admin-workflow.css";

type ApplicationSummary = {
  id: string;
  createdAt: string;
  completedAt?: string;
  complete: boolean;
  name: string;
  email: string;
  position: string;
  state: string;
  kind: "quick" | "full";
  screeningSigned?: boolean;
  screeningOwnerEmailSent?: boolean;
  screeningApplicantEmailSent?: boolean;
  screeningInviteExpiresAt?: number | null;
  fullInviteExpiresAt?: number | null;
  fullReceived?: boolean;
  fullRevisionNumber?: number;
};
type ApplicationDetail = {
  id: string;
  receivedAt: string;
  complete: boolean;
  applicant: Record<string, string>;
  hasQuickPdf: boolean;
  screeningSigned: boolean;
  hasScreeningPdf: boolean;
  hasFullPdf: boolean;
  fullRevisionNumber: number;
};

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<ApplicationDetail | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  const loadApplications = useCallback(async (cursor?: string, append = false) => {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const response = await fetch(`/api/admin/applications${query}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load driver applications.");
    const result = await response.json();
    setApplications((current) => append ? [...current, ...(result.applications || [])] : result.applications || []);
    setNextCursor(result.nextCursor || null);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then(async (result) => {
        if (!active) return;
        setAuthenticated(result.authenticated === true);
        if (new URLSearchParams(window.location.search).has("invalidLink"))
          setNotice("This sign-in link is missing, expired, or already used. Request a new one.");
        if (result.authenticated) await loadApplications();
      })
      .catch(() => {
        if (active) setNotice("Dashboard access could not be checked.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadApplications]);

  async function requestLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Sign-in is unavailable.");
      setNotice(result.message);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Sign-in is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  async function openApplication(id: string) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "view", id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not open application.");
      setSelected(result);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not open application.");
    } finally {
      setBusy(false);
    }
  }

  async function sendInvitation(quickId: string, purpose: "screening" | "full") {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invite", quickId, purpose }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Invitation could not be sent.");
      setNotice(`${purpose === "screening" ? "Screening" : "Full Application"} invitation sent to ${result.email}; expires ${new Date(result.expiresAt).toLocaleDateString()}.`);
      await loadApplications();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Invitation could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvitation(quickId: string, purpose: "screening" | "full") {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke-invitation", quickId, purpose }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Invitation could not be revoked.");
      setNotice(result.revoked ? "Invitation revoked." : "There was no active invitation to revoke.");
      await loadApplications();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Invitation could not be revoked.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteApplication(id: string, name: string) {
    if (!window.confirm(`Remove ${name}'s application from the active dashboard? Its signed records will be retained and its invitation links disabled.`)) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Application could not be removed.");
      setApplications((current) => current.filter((application) => application.id !== id));
      if (selected?.id === id) setSelected(null);
      setNotice("Application removed from the active dashboard. Signed records remain retained; invitation links are disabled.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Application could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  async function retryScreeningEmail(id: string) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry-screening-email", id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Screening email delivery failed.");
      setNotice("The completed screening PDF email was delivered to Moontera; any outstanding driver notification was sent too.");
      await loadApplications();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Screening email delivery failed.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    setAuthenticated(false);
    setApplications([]);
    setSelected(null);
  }

  if (loading)
    return <main className="admin-shell"><p>Checking secure access…</p></main>;

  if (!authenticated)
    return (
      <main className="admin-shell">
        <section className="admin-card admin-login">
          <p className="admin-eyebrow">MOONTERA LLC</p>
          <h1>Driver application dashboard</h1>
          <p>Sign in with the authorized company email. We’ll send a one-time link.</p>
          <form onSubmit={requestLink}>
            <label htmlFor="adminEmail">Company email</label>
            <input
              id="adminEmail"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button type="submit" disabled={busy}>{busy ? "Sending…" : "Email sign-in link"}</button>
          </form>
          {notice && <p className="admin-notice" role="status">{notice}</p>}
        </section>
      </main>
    );

  const visibleApplications = applications.filter((application) =>
    `${application.name} ${application.email} ${application.id}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">MOONTERA LLC</p>
          <h1>Driver applications</h1>
        </div>
        <button className="admin-secondary" type="button" onClick={logout}>Sign out</button>
      </header>
      <section className="admin-card">
        <div className="admin-list-heading">
          <div><h2>Quick Applications</h2><p>New applications are reviewed here before you invite a driver to the next step.</p></div>
          <input
            aria-label="Search applications"
            placeholder="Search name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {notice && <p className="admin-notice" role="alert">{notice}</p>}
        {visibleApplications.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
                  <thead><tr><th>Driver</th><th>Position</th><th>Received</th><th>Status</th><th>Next step</th><th /></tr></thead>
              <tbody>
                {visibleApplications.map((application) => (
                  <tr key={application.id}>
                    <td><strong>{application.name}</strong><span>{application.email}</span></td>
                    <td>{application.position || "-"}{application.state ? ` · ${application.state}` : ""}</td>
                    <td>{new Date(application.createdAt).toLocaleDateString()}</td>
                    <td>{application.complete ? `Quick received${application.screeningSigned ? ` · Screening signed${application.screeningOwnerEmailSent ? " · Moontera email sent" : " · Moontera email pending"}${application.screeningApplicantEmailSent ? " · Driver email sent" : ""}` : application.screeningInviteExpiresAt ? " · Screening invited" : ""}${application.fullReceived ? ` · Full received${application.fullRevisionNumber ? ` (Rev. ${application.fullRevisionNumber})` : ""}` : application.fullInviteExpiresAt ? " · Full invited" : ""}` : "Email delivery pending"}</td>
                    <td className="admin-next-step">
                      {application.screeningInviteExpiresAt && <small>Screening expires {new Date(application.screeningInviteExpiresAt).toLocaleDateString()}</small>}
                      {application.screeningInviteExpiresAt && <button className="admin-link-button" type="button" disabled={busy} onClick={() => revokeInvitation(application.id, "screening")}>Revoke Screening</button>}
                      {application.screeningSigned && !application.screeningOwnerEmailSent && <button className="admin-secondary" type="button" disabled={busy} onClick={() => retryScreeningEmail(application.id)}>Retry screening email</button>}
                      {application.fullInviteExpiresAt && <small>Full invite expires {new Date(application.fullInviteExpiresAt).toLocaleDateString()}</small>}
                      {application.fullInviteExpiresAt && <button className="admin-link-button" type="button" disabled={busy} onClick={() => revokeInvitation(application.id, "full")}>Revoke Full</button>}
                      <button className="admin-secondary" type="button" disabled={busy || !application.complete} onClick={() => sendInvitation(application.id, "screening")}>Screening</button>
                      <button className="admin-secondary" type="button" disabled={busy || !application.screeningSigned} title={application.screeningSigned ? "" : "A signed Screening record is required first"} onClick={() => sendInvitation(application.id, "full")}>Full application</button>
                    </td>
                    <td><div className="admin-row-actions"><button className="admin-secondary" type="button" disabled={busy} onClick={() => openApplication(application.id)}>View</button><button className="admin-secondary" type="button" disabled={busy} onClick={() => deleteApplication(application.id, application.name)}>Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="admin-empty">No applications match this search.</p>}
        {nextCursor && <button className="admin-secondary admin-load-more" type="button" disabled={busy} onClick={() => loadApplications(nextCursor, true)}>Load older applications</button>}
      </section>
      {selected && (
        <section className="admin-card admin-detail">
          <div className="admin-list-heading"><div><p className="admin-eyebrow">APPLICATION {selected.id.slice(0, 8).toUpperCase()}</p><h2>{[selected.applicant.first_name, selected.applicant.middle_name, selected.applicant.last_name].filter(Boolean).join(" ") || selected.applicant.full_name}</h2><p>{selected.applicant.email} · Received {new Date(selected.receivedAt).toLocaleString()}</p></div><button className="admin-secondary" type="button" onClick={() => setSelected(null)}>Close</button></div>
          <dl className="admin-fields">
            {Object.entries(selected.applicant).map(([key, value]) => (
              <div key={key}><dt>{key.replaceAll("_", " ")}</dt><dd>{value || "Not provided"}</dd></div>
            ))}
          </dl>
          <div className="admin-pdf-links">
            {selected.hasQuickPdf && <a className="admin-secondary" href={`/api/admin/application-pdf?id=${selected.id}&kind=quick`}>Download Quick PDF</a>}
            {selected.hasScreeningPdf && <a className="admin-secondary" href={`/api/admin/application-pdf?id=${selected.id}&kind=screening`}>Download Screening Consents</a>}
            {selected.hasFullPdf && (selected.fullRevisionNumber ? <>
              <a className="admin-secondary" href={`/api/admin/application-pdf?id=${selected.id}&kind=full`}>Download latest Full PDF (Revision {selected.fullRevisionNumber})</a>
              <a className="admin-secondary" href={`/api/admin/application-pdf?id=${selected.id}&kind=full-original`}>Download original Full PDF</a>
              {Array.from({ length: selected.fullRevisionNumber }, (_, index) => index + 1).map((revision) => <a className="admin-secondary" key={revision} href={`/api/admin/application-pdf?id=${selected.id}&kind=revision&revision=${revision}`}>Download Revision {revision}</a>)}
            </> : <a className="admin-secondary" href={`/api/admin/application-pdf?id=${selected.id}&kind=full`}>Download Full PDF</a>)}
          </div>
        </section>
      )}
      <p className="admin-footer">Application details are private. Sign out when finished.</p>
    </main>
  );
}
