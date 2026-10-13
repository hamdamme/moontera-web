# Driver application preview

Route: `/apply`. Existing `/application` and its endpoints are unchanged.

Implemented: six-step responsive form, conditional questions, repeatable history, SSN/phone formatting, required-field and date-order checks, accessible error feedback, review/edit, typed or pointer-drawn signature preview, client-side PDF generation.

Privacy boundary: answers are React state only, never localStorage, URLs, analytics, existing email endpoints, or a database. Refreshing loses progress. PDF generation happens on the device. The downloadable copy contains supplied personal information. Use test data until production handling is connected.

This is not a hiring submission or verified signature service. No reports are requested and MVR/PSP authorizations are not executed. Production work: choose secure submission/storage and retention/access controls, implement validated server-side intake and resumable drafts, integrate the signing provider's exact standalone authorization documents and audit evidence, and review qualification/legal wording with the screening provider. Expand history coverage validation for required periods before launch. Do not email full SSNs.

PDF output uses variable-length pagination instead of constraining responses to a fixed blank form. The bundled Geist font comes from Next's `@vercel/og` distribution; preserve the accompanying license.

## Document preview

`/apply/documents` presents MVR and PSP separately, followed by the supplied Driver Safety, Cargo, and Accident policies. An optional passenger **request** captures route details; it does not grant carrier permission. Each document keeps independent, in-memory acknowledgment/signature state. Editing clears its reviewed status. There are no report requests, submissions, PDF creation, or persistent records on this route.

Policy text comes from the supplied source PDFs, with presentation cleanup (page footers, repeated form lines, contents lists and letterhead removed). Policy terms are not a compliance review. The source Safety document ends its truck-cleanliness disciplinary list with “suspension,”; confirm the source before production. Effective dates, policy revisions, company countersigning, and any per-section initials must be finalized before launch.

PSP language is transcribed from pages 15–16 of https://www.psp.fmcsa.dot.gov/PspApi/Documents/PSPMotorCarrierEnrollment.pdf (accessed 2026-10-13), filling Moontera LLC into the employer blanks. Verify the complete standalone signing envelope against the provider-required form before live use. MVR is a separate draft adapted from the supplied combined authorization, restricted to MVR employment/qualification purposes. Provider and applicable state disclosures remain a launch requirement. Passenger waiver terms from the third-party template are not adopted; the company must finalize them and approve each trip before issuing authorization.
