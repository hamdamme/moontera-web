# Moontera LLC website

Next.js 16 driver application workflow using private Vercel Blob storage and Resend.

## Driver workflow

1. Drivers submit the public Quick Application at `/application/details`. Completed submissions are retained; another Quick Application is accepted after 90 full days. Owner email includes a PDF; driver email contains a receipt only.
2. An administrator signs in at `/admin` with the authorized `llcmoontera@gmail.com` email, reviews Quick Applications, and manually sends a 14-day Screening invitation.
3. After Screening is signed, the administrator manually sends the 14-day Full Application invitation. The applicant verifies the invited address by email code before any prefilled details or saved draft are displayed.
4. Full Application answers autosave to private storage. A signed application is immutable; changes are saved as a draft and require a fresh signature before a numbered revision is emailed. Expired invite tokens do not grant access.

`/api/cron/purge-full-drafts` removes only drafts past their `retentionEndsAt` date. The schedule is daily at 11:00 UTC. Set `CRON_SECRET` in the hosting environment; the scheduled request must include it as a Bearer token. Draft retention is 30 days beyond the original Full invitation expiration. Signed records are retained separately; their retention period still requires an owner-approved legal policy.

## Environment variables

Configure these in local `.env.local` and in Vercel Preview/Production as appropriate. Never commit their values.

| Name | Purpose |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Private Vercel Blob access for application, invitation, draft, and consent records. |
| `RESEND_API_KEY` | Resend email delivery. |
| `APPLICATION_KEY_SECRET` | HMAC key for stable private application storage paths. Use a long random secret. |
| `APPLICATION_FROM` | Optional verified sender, e.g. `Moontera LLC <info@moonterallc.com>`. |
| `APP_BASE_URL` | Canonical application origin used to build secure invitation links. |
| `ADMIN_EMAIL` | Optional; must remain `llcmoontera@gmail.com` unless the owner explicitly changes the authorized administrator. |
| `CLEARINGHOUSE_LIMITED_QUERY_TEXT` | Exact, counsel-approved limited-query disclosure. |
| `CLEARINGHOUSE_CONSENT_PERIOD` | Exact consent period stated in the approved text. |
| `SCREENING_LEGAL_APPROVED` | Set to `true` only after the owner/legal reviewer approves operative Screening language. Otherwise Screening submissions are blocked. |
| `CRON_SECRET` | Secret used to protect the daily draft cleanup endpoint. |

The Screening route remains intentionally unavailable until all Clearinghouse approval settings are configured. This site does not order MVR/PSP reports or submit an official FMCSA Clearinghouse query. Drivers must provide required full-query consent through the official Clearinghouse.

## Admin operations and recovery

- The dashboard shows Quick intake, invitation expiry, and simple Screening/Full workflow states. Sending or replacing an invitation is a manual administrator action; replacing one revokes the prior link.
- The dashboard can download private Quick, Screening Consents, and Full Application PDFs. Full revisions are separately preserved and downloadable.
- Email delivery uses Resend idempotency keys. If a submission reports that delivery is incomplete, retry the same operation; do not create a second application.
- Keep Resend and Vercel access restricted. Application PDFs contain sensitive personal information and are emailed to the owner account.
- There is no automated retention policy for signed Quick, Screening, or Full records yet. Approve a legal retention/deletion schedule before production use.

## Local development and checks

```bash
npm ci
npm run dev
npm run test:application
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

The test command creates synthetic Quick, Screening, Full, and revised Full PDF samples in `/private/tmp/moontera-application-qa` by default. The sample Clearinghouse wording is explicitly synthetic and must not be used with applicants. Set `APPLICATION_QA_DIR` to choose a different temporary output folder.

## Release gates

Do not use this workflow for hiring until the owner approves the forms and PDF layouts, a qualified compliance adviser reviews the operative Clearinghouse and prior-employer authorization language and record-retention policy, Resend confirms the sending domain, and the owner confirms that the selected Vercel plan permits commercial use. Production release requires an explicit owner go-ahead after those reviews and acceptance tests. No paid plan upgrade is assumed or authorized by this repository.
