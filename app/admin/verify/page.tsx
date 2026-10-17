"use client";

import { useEffect, useState } from "react";
import "../admin.css";

export default function VerifyAdminLink() {
  const [message, setMessage] = useState("Verifying your sign-in link…");

  useEffect(() => {
    let active = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
    window.history.replaceState(null, "", "/admin/verify");
    if (!token) {
      window.location.replace("/admin?invalidLink=1");
      return;
    }
    fetch("/api/admin/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Sign-in failed.");
        window.location.replace("/admin");
      })
      .catch((error: unknown) => {
        if (active)
          setMessage(error instanceof Error ? error.message : "Sign-in failed. Request a new link.");
      });
    return () => { active = false; };
  }, []);

  return <main className="admin-shell"><section className="admin-card admin-login"><p className="admin-eyebrow">MOONTERA LLC</p><h1>Secure sign-in</h1><p role="status">{message}</p><a href="/admin">Return to dashboard</a></section></main>;
}
