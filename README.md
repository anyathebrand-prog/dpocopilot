# DPO Copilot

NDPA 2023 compliance workspace for Nigerian DPCOs. Built from the six spec documents in this folder (brief, PRD v1.3, TRD, app flow, design brief, backend schema).

## Run it

```bash
npm install
DEV_SKIP_MFA=1 npm run dev      # http://localhost:3000
```

- **Firm:** open `/sign-up` to create a firm. You become its Firm Admin.
- **Secretary (dev only):** `secretary@dpocopilot.local` / `secretary-dev-only`.
- **Emails and SMS aren't sent yet.** Invitation links and signing codes print to the server log as `[outbound email → …]`.
- **Database:** embedded Postgres (PGlite) in `./data`. Delete `./data` to start fresh.
- **MFA:** `DEV_SKIP_MFA=1` skips the mandatory two-step setup for Firm Admins and the Secretary. It is ignored in production.

## Checks

```bash
npm test                                   # deadlines, readiness score, gap rules, MI indicator, CSV import, TOTP
npm run typecheck
DEV_SKIP_MFA=1 npm run dev > dev.log 2>&1  # then, in another terminal:
npm run smoke -- dev.log                   # end-to-end: onboarding → approval → signing → breach → isolation
```

## Environment

| Variable | Purpose |
|---|---|
| `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY` | Any OpenAI-compatible endpoint (e.g. vLLM hosted in Nigeria, per NFR5). If unset, AI drafting uses the standard templates and Q&A shows the matching library passages without a written answer. |
| `CLAMD_HOST`, `CLAMD_PORT` | ClamAV scanner. Uploads are refused in production until this is set. |
| `APP_URL` | Base URL used in invitation links. |

## What's built

All V1 must-haves (F1–F18): firm workspace and roles, multi-client dashboard with the "Waiting for my review" queue, onboarding questionnaire → data inventory → proposed RoPA, the major-importance indicator, DPIA workflow with risk scoring and versioning, policy generator (3 templates), breaches with the 72-hour countdown, DSARs with the 30-day deadline, evidence vault and CAR readiness score, tasks and calendar, client portal with OTP sign-off, the AI copilot (drafting, rule-based gap analysis, cited Q&A), activity log, PDF/Word export, CSV import, and the Secretary console with publishing.

## Defaults chosen for open questions

These are the specs' open flags, answered with the least-surprising default. Change them as decisions land.

- **FLAG-1 sign-up:** open sign-up (`app/sign-up`).
- **FLAG-3 reviewer rejection:** reviewers can "Send back to draft".
- **FLAG-4 client declines to sign:** not built. The client simply doesn't sign.
- **FLAG-5 / Q-1 signature:** typed name + 6-digit email code + SHA-256 of the exact version.
- **FLAG-6 portal visibility:** contacts see the status of what they reported.
- **FLAG-8 breach alerts:** go to the assigned team plus all Lead Consultants and Firm Admins.
- **FLAG-11 firm-side evidence upload:** allowed.
- **FLAG-13 changed answers:** "Update inventory" adds new items only and never overwrites RoPA entries.
- **FLAG-16:** a firm must keep at least one active Firm Admin.
- **FLAG-17 Q&A history:** not stored.
- **Statuses and severity:** breach and DSAR `open`/`closed`; severity and gap levels `low`/`medium`/`high`; risk scale 1–5.

## Not done yet (before a real pilot)

- **Regulatory library is a paraphrased seed (`v0-seed`), not official text.** The Secretary must load the gazetted NDPA and NDPC guidance and publish it. The major-importance threshold (200 subjects in 6 months) is also a placeholder to confirm.
- **Hosting in Nigeria:** swap PGlite for Postgres 16, local disk for S3-compatible storage, and add a real email/SMS relay (`lib/auth.ts` `send()`).
- **Security:** database row-level security as the second layer (tenancy is enforced in the app layer today), MFA secrets encrypted at rest, rate limits stored in the DB when running more than one instance, and a penetration test.
- **Not built:** Excel (.xlsx) and bulk-file import (CSV only today), tagged PDF / native .docx export (browser print and HTML-as-.doc today), Secretary-editable policy templates, month-grid calendar, pgvector retrieval, and Playwright + axe accessibility tests.
