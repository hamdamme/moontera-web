# Driver workflow implementation status

Updated 2026-10-17 on `codex/quick-90-day-reapply`.

## Implemented

- Quick Application accepts a new submission after 90 full days, preserves completed history, and keeps same-request delivery retries idempotent.
- Quick and Full submission intake applies a shared-network attempt limit; stored rate-limit keys are HMAC digests and expire automatically.
- Full Application is invitation-only and requires email OTP before personal data, prefill, or drafts are returned. Full SSN is never collected online. A retained draft keeps the original invitation's expiry-plus-30-day deletion deadline across replacement invitations.
- Full Application autosaves validated answers to private Blob storage with version checks and restores them on a valid verified invitation. A daily Vercel Cron route deletes drafts after the original invitation expiration plus 30 days and removes expired invitation/authentication artifacts.
- A driver can edit a signed Full Application during the valid invitation period. Changes remain an unsigned autosaved draft until the driver signs again; the signed revision PDF is immutable, numbered, and emailed once to the owner with a plain applicant receipt.
- Screening invitations are issued manually, expire after 14 days, and replacements revoke the previous link. Full invitations require signed Screening consent. Screening consent records are immutable; replacement consent is a separate record.
- Single-admin passwordless sign-in, session-protected application lists/details, invitation expiry and revocation controls, and private PDF downloads for Quick, Screening, original Full, latest Full, and numbered revisions are implemented.
- Screening includes MVR/PSP, limited-query disclosure gating, the official Clearinghouse full-query caveat, typed acknowledgments, and private consent PDF delivery. No external report or Clearinghouse query is ordered by this site.
- README documents operations and environment variable names. Synthetic Quick, Screening, Full, and Full Revision 1 PDFs are generated under `/private/tmp/moontera-application-qa` and are not tracked.

## Verification

- `npm run test:application` — passed, including validation, Quick retry/90-day behavior, draft sanitization and fixed retention deadlines across replacement invites, PDF generation, and synthetic form PDFs.
- `npm run lint` — passed.
- `npx tsc --noEmit --incremental false` — passed.
- `npm run build` — passed with Next.js 16.2.4 after the sandbox granted build-output access.
- Local smoke test: public `/apply`, `/admin`, and `/driver-screening` return 200; unauthenticated Full session and admin application APIs return 401.
- Synthetic Full and Screening PDF pages were rendered and visually reviewed. No live Resend, Blob, or driver-data end-to-end acceptance run was performed.

## Release blockers

- **Legal/compliance:** a qualified reviewer and owner must approve exact Clearinghouse limited-query language and period, the prior-employer authorization language, the screening/full forms, and retention/deletion policy. Screening submission remains blocked unless the explicit approval environment settings are configured.
- **Hosting:** verify the commercial-use plan and data-processing posture. Vercel's current terms restrict Hobby to personal/non-commercial use; a paid plan may cost money and no upgrade is authorized. The Vercel project listing works, but project inspection, deployment listing, and environment metadata requests return 403 for scope `moontera-web-s-projects`; no Vercel CLI is installed here.
- **Email:** Resend reports `moonterallc.com` as **verified**. Production delivery acceptance still needs to confirm the configured sender, owner PDF attachment, and applicant receipt without sending real driver data.
- **Owner acceptance:** test with synthetic records and confirm owner receipt PDFs, driver receipts, screening approval gate, OTP, draft resumption, and signed revision delivery.
- **Repository release:** feature branch is pushed and draft PR [#11](https://github.com/hamdamme/moontera-web/pull/11) is open. Production was not deployed. The spec requires owner go-ahead after the review and acceptance gates; the request to deploy does not waive those open compliance and hosting gates.

## Next release sequence

1. Owner obtains legal review and supplies the approved Clearinghouse consent text/period; decide signed-record retention.
2. Owner confirms commercial hosting plan; run synthetic email-delivery acceptance using the verified Resend domain.
3. Restore Vercel project scope access, run production-like acceptance tests, and review generated synthetic PDFs.
4. Complete the required review/acceptance gates, mark PR #11 ready for review, and obtain owner release approval before production deployment.
