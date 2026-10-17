# Driver workflow implementation status

Updated 2026-10-16 on `codex/quick-90-day-reapply`.

## Completed and verified

- Quick Application reapplication is available after 90 full days from the last successful submission. Historical records are archived and same-request retries remain idempotent.
- Quick intake validates contact details, CDL and medical-card dates, conditional DOT test date, and optional last four SSN digits. It does not collect a full SSN.
- Owner PDFs remain attached to internal email; applicants receive a plain confirmation.
- Contact-form submissions are no longer written to application logs.
- `npm run test:application`, `npm run lint`, and `npx tsc --noEmit --incremental false` pass.

## Not complete; do not treat this branch as production-ready

- `/apply` remains public. There is no invitation validation, email OTP, private draft autosave, revision/signature workflow, or secure admin dashboard.
- `/driver-screening` and screening invitation/consent/PDF routes are absent.
- Existing application schema still contains the Clearinghouse/SMS/last-test fields that the specification says to relocate or remove. Revised driving-experience and prior-employer authorization layouts are not implemented.
- Legal review is still required for Clearinghouse limited-query consent scope and the proposed prior-employer drug/alcohol authorization. No new consent language should be represented as approved.
- Vercel project access returned 403 for the configured team, so deployment configuration and environment cannot be verified from this session. The Vercel CLI is unavailable here.
- The specification requires a commercial-use hosting plan review before release; no plan change or paid upgrade is authorized.
- Owner acceptance testing and release approval are outstanding.

## Release sequence

1. Implement and test the invitation, verification, screening, and private admin workflows.
2. Obtain owner/legal approval for operative consent language and retention rules.
3. Reconnect Vercel with access to the `moontera-web` project; confirm commercial-use plan and production environment variables without exposing secret values.
4. Run production-like acceptance tests, then deploy and verify the live driver and owner flows.
