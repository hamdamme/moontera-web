# Driver applications

- `/application/details`: Quick Application, a single scrolling page with contact, position, CDL, DOT medical card, last drug test details, and required SSN last four. The Quick Application does not ask for the DOT medical card issue date. No separate consent is gathered.
- `/apply`: Full Driver Application with employment/driving history, CDL, medical/DOT fields, Clearinghouse acknowledgment and optional SMS consent.
- `/application`: redirects to `/apply`.
- `/apply/documents`: company policy **previews** only. MVR and PSP screening authorizations are no longer listed here and are not part of the Quick Application.

Both forms POST to their corresponding `/api/application/{quick,full}` route. The server validates fields and record counts, generates a completed PDF, stores a private record, emails the PDF to `llcmoontera@gmail.com`, and sends the applicant a separate text confirmation without the PDF. Applicant answers are not stored in browser storage. Session storage contains only a random request ID keyed by a hash of email/type for retry handling.

## Production setup

Required environment variables:

- `RESEND_API_KEY`: sending access for the verified `moonterallc.com` domain.
- `BLOB_READ_WRITE_TOKEN`: private Vercel Blob store. Never use a public store.
- `APPLICATION_KEY_SECRET`: stable random secret used to HMAC normalized email addresses in record paths. Do not rotate without migrating record keys; rotating it would break existing duplicate detection.
- Optional `APPLICATION_FROM`: defaults to `Moontera LLC <info@moonterallc.com>`.

The verified sending domain is required for driver confirmations. `onboarding@resend.dev` is not a production fallback. API failures return an error, never a false success.

## Duplicate prevention and delivery recovery

The rule is one Quick Application and one Full Application per normalized email address (trimmed/lowercased). Private records have no expiry. Existing submissions predating this implementation have no durable record and are not backfilled. Applicant identity is not verified by email ownership, so staff must handle disputes or corrections.

Blob creation without overwrite atomically claims the email/type key. ETag conditional writes claim a two-minute processing lease, preventing concurrent requests from sending twice. Owner and applicant email IDs are saved separately. A retry resumes the same immutable payload/PDF and sends only the missing message, with a per-record/per-recipient Resend idempotency key. The random client request ID is not a substitute for the email/type uniqueness check.

If a provider response or persistence write is uncertain, automatic client retries stop after 23 hours (before Resend's 24-hour idempotency window expires). The response gives the saved reference and asks the applicant to contact the company. This prevents an ambiguous late retry from creating duplicate mail. There is no automatic background retry worker: pending failures remain in private storage for staff review or a client retry. Operators should inspect incomplete records and correlate the record ID with Resend logs before resending or marking delivery. Never delete a record just to retry an email. Once both provider acknowledgments are recorded, the form displays a receipt and disables additional submission.

Private records contain applicant data, the completed PDF, receipt IDs and receipt timestamps. They can be accessed only through authenticated Vercel storage administration; there is no public record or PDF endpoint. Limit account access and establish retention/deletion handling for recruitment records. Do not put application contents in logs.

## PDF and checks

`lib/applications/submission-pdf.ts` renders field boxes that wrap and paginate instead of squeezing long answers into a blank template. `assets/application-reference.pdf` is the supplied blank draft, used only for its existing emblem. It is included in server function tracing, not served publicly. The output records submission time, reference, certification and typed/drawn signature; it does not represent an independently verified signature certificate or separate MVR/PSP consent.

`npm run test:application` covers required groups/fields, date/phone validation, normalized email, concurrent duplicates, repeat requests, partial email failures, retry cutoff and sample PDF generation. Default sample output is `/private/tmp/moontera-application-qa`.

Policy previews retain supplied policy wording plus the owner's contractor terms. Finalize policy version/effective dates, provider-required standalone authorizations, any per-section initials, and company approval for passenger requests separately. Full Clearinghouse queries still require consent in the FMCSA portal. History coverage periods are prompted but not automatically audited for gaps.
