# DPO Copilot — Technical Requirements Document (V1)

**Status:** Draft v1.0
**Based on:** DPO Copilot PRD v1.2 (approved scope; not changed here)
**Author role:** Senior Software Architect
**Date:** 25 September 2026

---

## 0. How to Read This Document

- Requirement IDs (F1–F20, FR x.x, NFR x) refer to the PRD v1.2.
- **[FLAG-n]** marks a requirement the proposed stack cannot fully satisfy, or can only satisfy once an open decision is made. All flags are collected in §14.
- **[Q-n]** marks a decision that depends on information not yet available. All questions are collected in §16.

---

## 1. Architecture Summary

**Recommendation: a single TypeScript modular monolith, one PostgreSQL database, one background worker, S3-compatible file storage, and a self-hosted AI inference service, all deployed in Nigeria.**

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + React + TypeScript, Tailwind CSS, shadcn/ui (Radix primitives) |
| Backend | Same Next.js application (server actions + route handlers) with a separate **worker process** from the same codebase |
| Database | PostgreSQL 16+ with the **pgvector** extension |
| Background jobs | Postgres-backed queue (**pg-boss**); no Redis |
| File storage | S3-compatible object storage hosted in Nigeria |
| Authentication | **Better Auth** (self-hosted library): email + password, TOTP MFA, organisation/role support; sessions stored in Postgres |
| AI inference | Self-hosted open-weight LLM + embedding model served by **vLLM** (OpenAI-compatible API) on a GPU server in Nigeria, behind an internal AI gateway module |
| Documents | TipTap editor (in-app editing); Playwright/Chromium for PDF export; `docx` for Word export |
| Import | SheetJS/ExcelJS (Excel), Papa Parse (CSV), Zod validation |
| Malware scanning | ClamAV, run by the worker |
| Deployment | Docker containers on Linux VMs in a Nigerian data centre; Caddy or Nginx as reverse proxy with TLS |

Why this shape: every approved feature is CRUD + workflow + documents + a few AI calls, for small DPCO teams (2–15 users per firm) and a pilot of 3–5 firms. That load fits comfortably on one app, one database and one worker. Splitting into microservices, adding Kubernetes, Redis, a separate vector database or an event bus would add operating cost with no requirement that needs them.

---

## 2. System Architecture and Responsibility Boundaries

### 2.1 Components

```
                    Users (Firm staff, Client Contacts, Secretary)
                                     │ HTTPS
                                     ▼
                     ┌──────────────────────────────┐
                     │ Reverse proxy (Caddy/Nginx)  │  TLS termination in Nigeria
                     └──────────────┬───────────────┘
                                    ▼
      ┌─────────────────────────────────────────────────────────┐
      │ WEB APP (Next.js, stateless, 2 instances)                │
      │  • Firm workspace UI      • Client portal UI             │
      │  • Secretary console UI   • Server actions / API routes  │
      │  • AuthZ + tenancy guard  • Enqueues background jobs     │
      └───────┬───────────────────────┬─────────────────┬───────┘
              │ SQL (RLS enforced)    │ S3 API          │ HTTP (internal)
              ▼                       ▼                 ▼
      ┌───────────────┐      ┌────────────────┐   ┌──────────────────┐
      │ PostgreSQL    │      │ Object storage │   │ AI inference     │
      │ + pgvector    │      │ (files, exports│   │ (vLLM: LLM +     │
      │ + pg-boss     │      │  backups)      │   │  embeddings, GPU)│
      └───────▲───────┘      └───────▲────────┘   └────────▲─────────┘
              │                      │                     │
      ┌───────┴──────────────────────┴─────────────────────┴───────┐
      │ WORKER (same codebase, separate process)                    │
      │  • AI drafting / gap narrative / Q&A retrieval jobs          │
      │  • Regulatory library ingestion (extract → chunk → embed)    │
      │  • Import processing  • Malware scan (ClamAV)                │
      │  • PDF/Word export    • Deadline & reminder scheduler        │
      │  • Email/SMS dispatch                                        │
      └──────────────────────────────┬──────────────────────────────┘
                                     ▼
                     Email (SMTP relay) / SMS (OTP gateway)
```

### 2.2 Code Modules (inside the monolith)

| Module | Owns | PRD features |
|---|---|---|
| `identity` | Users, sessions, MFA, roles, invitations | F1, F10 (portal accounts) |
| `tenancy` | Firms, client assignments, access guard, RLS session context | F1, F2, F10 |
| `clients` | Client records, dashboard aggregates | F2 |
| `datamap` | Questionnaire, data inventory, major-importance indicator | F3 |
| `ropa` | Processing activities | F4 |
| `dpia` | DPIA workflow, risk scoring, versions | F5 |
| `documents` | Policy templates, editor content, versions, NDPA mapping tags | F6, F15 |
| `incidents` | Breach log, 72-hour countdown | F7 |
| `evidence` | Requests, uploads, CAR checklist, readiness score | F8 |
| `dsar` | Data subject requests, 30-day deadline | F16 |
| `work` | Tasks, calendar, auto-generated deadlines | F9 |
| `approvals` | Review flow, firm approval, client signature, version locking | F14 |
| `audit` | Append-only activity log | F14 |
| `ai` | AI gateway, prompts, retrieval, drafting, output labelling | F11, F12, F13 |
| `gaps` | Deterministic gap rules engine | F12 |
| `content` | Regulatory library, criteria, templates, checklist template, publishing | F18 |
| `imports` | Excel/CSV and bulk-file import | F17 |
| `notify` | In-app notifications, email, SMS | F7 alerts, F14 OTP, F19 |

**Boundary rules**
- Modules call each other only through exported service functions, not each other's tables.
- Only `tenancy` sets tenant context; every request and every job runs with a firm (and, for portal users, client) context.
- Only `ai` talks to the inference service. No other module builds prompts.
- Only `audit` writes the activity log, and it can only insert.

### 2.3 Key Design Decisions Inside the Architecture

- **Gap analysis is deterministic, not AI-detected.** The FR12.2 gap rules run as SQL/TypeScript rules against structured data. The AI only writes the plain-language explanation and suggested next action. This is what makes the PRD acceptance criterion ("detects every seeded gap type") reliably testable.
- **Major-importance indicator is rule-based.** Criteria are stored as data maintained by the Secretary (F18), evaluated deterministically, with reasoning and source version shown (FR3.5).
- **Regulatory Q&A uses retrieval with a refusal threshold.** Answers are generated only from retrieved library passages; if retrieval confidence is below a tuned threshold, the system returns "not covered" instead of calling the model (FR13.3).
- **All times stored in UTC, shown in WAT** (`Africa/Lagos`, no daylight saving) (NFR18).
- **Deadlines are computed server-side** (72-hour breach, 30-day DSAR, due dates) and stored, so dashboard, calendar and alerts all agree.

---

## 3. Frontend

| Item | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router), React, TypeScript | Server-rendered pages keep first load fast on 4G (NFR14) |
| Styling | Tailwind CSS | |
| Components | shadcn/ui on Radix primitives | Accessible by default (keyboard, focus, ARIA) for NFR17 |
| Forms | React Hook Form + Zod | Same Zod schemas validate on server |
| Rich text | TipTap (ProseMirror) | Policy and DPIA editing (FR6.3); stored as JSON + rendered HTML |
| Tables | TanStack Table | RoPA, evidence, DSAR lists |
| Calendar | A lightweight React calendar component (e.g. FullCalendar or react-big-calendar) | F9 |
| Countdown | Client-side timer driven by server deadline timestamp | FR7.3 |
| Mobile | Responsive layouts; client portal designed mobile-first | NFR16 |

Three UI surfaces share one app with route groups: `/(firm)`, `/(portal)`, `/(secretary)`. Each group has its own layout and access guard.

---

## 4. Backend

- **Runtime:** Node.js LTS.
- **API style:** Next.js server actions for UI mutations; route handlers for file upload/download, exports, and health checks. No public API in V1.
- **Validation:** Zod on every input, server-side.
- **Authorisation:** Central `can(user, action, resource)` policy function in `tenancy`, called by every server action, **plus** PostgreSQL Row-Level Security as a second layer (NFR2, NFR4).
- **Background jobs (pg-boss):** AI generation, ingestion, import, malware scan, export, notifications, and a scheduler for deadline reminders. Jobs are retried with backoff and their status is shown in the UI (NFR15).
- **ORM:** Drizzle ORM with SQL migrations (chosen over Prisma because it works cleanly with Postgres RLS session settings and raw SQL where needed).

---

## 5. Database

**PostgreSQL 16+ with pgvector.**

### 5.1 Tenancy Model
- Shared database, shared schema. Every tenant-owned table has `firm_id`; client-scoped tables also have `client_id`.
- RLS policies read `app.firm_id`, `app.user_id`, `app.role` and (for portal users) `app.client_id`, set per transaction by `tenancy`.
- Associate access is limited through a `client_assignments` table referenced by the RLS policy (FR1.3).
- Regulatory content (F18) is platform-level, readable by all firms, writable only by the Secretary role.

### 5.2 Key Data Structures
- **Versioned records:** DPIAs, documents and signed items use immutable version rows; the "current" pointer moves forward. Approved/signed versions are never updated (FR5.3, FR14.4).
- **Audit log:** Append-only table. The application database role has `INSERT` and `SELECT` only; no `UPDATE`/`DELETE` (FR14.5).
- **AI provenance:** Every AI-generated artefact stores model name/version, prompt template version, source passages used, and the approving user (NFR9).
- **Embeddings:** `regulatory_chunks` table with pgvector column and a reference to the source document version (FR18.4).
- **CAR checklist:** Template (platform-level, versioned) → instantiated per client; score computed from item statuses (FR8.4–8.5).

### 5.3 Backups
- Nightly full backup + continuous WAL archiving (point-in-time recovery) using **pgBackRest**, stored encrypted in Nigerian object storage (NFR13).
- Monthly restore test into a temporary, isolated, access-controlled environment inside the production provider in Nigeria (never into staging, which holds synthetic data only), destroyed after the test.
- **[FLAG-4]** see §14 on second-location backups.

---

## 6. Authentication and Access

| Need | Approach |
|---|---|
| Firm staff & Secretary login | Email + password (Argon2id hashing), TOTP MFA; MFA **mandatory** for Firm Admin and Secretary (NFR3) |
| Client Contact login | Email invitation → set password; optional TOTP; magic-link sign-in as an option for low-friction mobile use |
| Sessions | Server-side sessions in Postgres, secure HTTP-only cookies, short idle timeout for Secretary |
| Roles | Firm Admin, Lead Consultant, Associate, Client Contact, Secretary |
| Invitations | Signed, single-use, expiring tokens |
| Deactivation | Revokes all sessions immediately (F1 acceptance) |
| Brute force | Rate limiting on login, OTP and invite endpoints (stored in Postgres) |

**Why Better Auth:** self-hosted TypeScript library with MFA and organisation support, so user and session data stay in our Nigerian database (NFR5). Hosted identity services (Auth0, Clerk, Firebase Auth, Supabase Cloud Auth) were rejected because they store identity data outside Nigeria.

### 6.1 Client Signature (FR14.3)
Proposed default, pending **[Q-1]**:
1. Client Contact opens the exact document version to sign.
2. System renders the final PDF and computes its SHA-256 hash.
3. Contact types their full name and receives a one-time code by **SMS or email** (6 digits, 10-minute expiry, 5 attempts).
4. On success, the system stores: signer identity, typed name, timestamp (UTC), IP address, user agent, OTP channel, document version ID and hash.
5. A signature certificate page is appended to the exported PDF, and the signed version is locked.

**[FLAG-6]** If a legally qualified or certificate-based e-signature is required, this design is insufficient and a licensed e-signature provider must be added (see §14).

---

## 7. AI Architecture (F11, F12, F13)

### 7.1 Components
- **AI gateway (`ai` module):** Single interface for all model calls: prompt templates (versioned in code), PII-safe logging, timeouts, retries, output labelling ("AI draft"), and provenance storage.
- **Inference service:** vLLM serving (a) one instruction-tuned open-weight LLM and (b) one embedding model, via an OpenAI-compatible HTTP API on the private network. The specific models are chosen by an evaluation (§12.4), not in advance.
- **Retrieval:** pgvector similarity search over the regulatory library, filtered to the latest published content version, with hybrid keyword search (Postgres full-text) for statute section numbers.

### 7.2 Flows
- **Drafting (FR11):** Worker loads the client's structured data (inventory, RoPA, incident, DSAR) → fills a template prompt → model returns draft → saved as "AI draft" version → user edits/approves.
- **Gap analysis (FR12):** Rules engine produces gaps → AI writes explanation + next action for each (optional; rules output alone satisfies detection).
- **Q&A (FR13):** Retrieve passages → if below threshold, return "not covered" → else generate answer constrained to passages → validate that every cited passage ID exists → show citations + "not legal advice" notice.
- **Ingestion (F18):** Secretary uploads source → worker extracts text → splits by section → embeds → stores with document version → publish makes it live.

### 7.3 Data Rules
- No client data is used for training (NFR6). The self-hosted service does not persist prompts; gateway logs store metadata only, never prompt content.
- Portal users never reach AI endpoints (FR13.5).

**[FLAG-1] [FLAG-2]** Nigeria-only AI processing depends on GPU hosting availability and on open-weight model quality (§14).

---

## 8. External APIs and Services

| # | Service | Needed for | Data sent | Residency position |
|---|---|---|---|---|
| 1 | **Nigerian hosting provider** (VMs, block storage, private network) | Everything | All | Must be in Nigeria. Candidate options in §15.1 **[Q-2]** |
| 2 | **S3-compatible object storage in Nigeria** | Files, exports, backups | Evidence files, documents | Must be in Nigeria **[FLAG-3]** |
| 3 | **GPU compute in Nigeria** | AI inference | Client structured data, regulatory text | Must be in Nigeria **[FLAG-1]** |
| 4 | **Transactional email (SMTP relay)** | Invites, alerts (FR7.6), OTP, reminders | Recipient email address + minimal notice text | **[FLAG-5]** |
| 5 | **SMS gateway (Nigerian)** | Signature OTP (if SMS chosen) | Phone number + code | **[FLAG-5]** |
| 6 | **Code hosting + CI** (e.g. GitHub + GitHub Actions) | Source control, tests, image builds | Source code only; **no customer data** | Acceptable: no personal data |
| 7 | **Container registry** (e.g. GHCR) | Deploy images | Images only | Acceptable: no personal data |
| 8 | **External uptime monitor** | Availability checks (NFR12) | Pings a health URL only | Acceptable: no personal data |
| 9 | **DNS provider** | Domain resolution | None | Acceptable; **proxy/CDN mode must be off** for app domains (see §9.4) |

Services deliberately **not** used: hosted auth, hosted error tracking (Sentry SaaS), hosted analytics, third-party LLM APIs, CDN/WAF that terminates TLS outside Nigeria.

---

## 9. Security, Privacy and Secrets Handling

### 9.1 Data Protection
- **In transit:** TLS 1.2+ everywhere; HSTS; TLS also on internal links to database, storage and inference service (NFR1).
- **At rest:** Encrypted disk volumes; encrypted object storage buckets; encrypted backups (NFR1). MFA secrets and OTP seeds additionally encrypted at application level.
- **Tenant isolation:** Policy function + RLS; automated cross-tenant tests in CI (§12.2) (NFR2).
- **Files:** Uploaded to a quarantine prefix via short-lived pre-signed URLs → ClamAV scan → moved to clean prefix or rejected. Allow-list of file types and size caps (NFR8). Downloads only through short-lived signed URLs after an authorisation check.
- **Personal data minimisation:** Email and SMS never contain compliance content or personal data beyond the recipient's own contact details; they say "You have a new item — log in to view."

### 9.2 Secrets
- Secrets (database passwords, storage keys, SMTP/SMS keys, session signing keys) are never in the repository.
- Stored encrypted with **SOPS + age** in the deployment repository, decrypted only on the target server at deploy time and injected as environment variables. (Simplest option that works on any Nigerian provider without depending on a cloud-specific secrets service.)
- Separate secrets per environment; production secrets accessible to named operators only; rotation on staff change and at least yearly.
- CI holds only the credentials needed to push images and trigger deploys.

### 9.3 Platform Compliance (NFR7)
- DPO Copilot acts as a data processor for each firm: Data Processing Agreement template, platform privacy notice, sub-processor list (hosting, email, SMS), and a platform breach procedure. These are business deliverables that the architecture must support with logs and access records.

### 9.4 Network
- Only the reverse proxy is public. Database, storage, worker and inference service are on a private network.
- No CDN or WAF that decrypts traffic outside Nigeria. Static assets are served by the app itself (small enough for V1).
- Administrative access via SSH keys or VPN only; no password SSH.

### 9.5 Application Security
- CSRF protection (built into server actions + SameSite cookies), strict Content-Security-Policy, output encoding for rendered rich text (sanitise TipTap HTML), rate limits, dependency scanning in CI, and an external penetration test before launch (PRD §12).

---

## 10. Performance Requirements

| Requirement | Target | How |
|---|---|---|
| Standard page load (NFR14) | < 3 s on Nigerian 4G | Server rendering, hosted in Lagos (low latency), code splitting, image-free UI, DB indexes on `firm_id`/`client_id` |
| Dashboard | < 2 s for a firm with 100 clients | Aggregates computed with indexed queries; cached per firm for 60 s |
| Breach alert (FR7.6) | Enqueued < 10 s; delivered in-app instantly; email within 5 min subject to relay | High-priority queue |
| AI draft | Target < 60 s; shown as background job with progress | Worker + GPU sizing validated in load test |
| Q&A answer | Target < 20 s | Retrieval + single generation call |
| Import | 5,000 rows validated < 60 s | Worker job with row-level error report |
| Availability (NFR12) | 99.5% during WAT business hours | Two web instances, managed/replicated DB, Tier III+ data centre |

Capacity baseline for pilot: up to 5 firms, 75 firm users, 500 client contacts, 250 clients, 20 concurrent AI jobs/hour peak. Revisit at 25 firms.

---

## 11. Accessibility Requirements (NFR16, NFR17)

- WCAG 2.1 AA for all core flows in the firm workspace and client portal.
- Radix-based components for keyboard navigation and focus management; visible focus states; colour contrast ≥ 4.5:1.
- Countdown and deadline states conveyed with text, not colour alone.
- Form errors announced to screen readers and linked to fields.
- Client portal usable at 360 px width; touch targets ≥ 44 px.
- Automated checks with axe-core in Playwright tests; manual keyboard and screen-reader (NVDA/VoiceOver) pass before launch.

---

## 12. Testing Strategy

### 12.1 Levels
| Level | Tool | Scope |
|---|---|---|
| Unit | Vitest | Deadline maths (72 h, 30 days, WAT), readiness score, gap rules, major-importance rules, permission policy |
| Integration | Vitest + Testcontainers (real Postgres + pgvector) | Server actions, RLS policies, migrations, job handlers, import validation |
| End-to-end | Playwright | Every PRD acceptance criterion as a scenario, on desktop and mobile viewports |
| Accessibility | axe-core in Playwright | All core pages |
| Security | Dependency audit + SAST in CI; external pen test pre-launch | |

### 12.2 Must-Pass Suites (block release)
- **Tenant isolation suite:** For every entity type, prove that a user from Firm A, an unassigned Associate, and a Client Contact from Client B cannot read, list, update or download Client A data, including by direct URL/ID (NFR2, F1/F10 acceptance).
- **Approval & lock suite:** Associates cannot approve; signed/approved versions cannot change (F14).
- **Deadline suite:** Breach and DSAR deadlines correct across month ends and time zones.
- **Audit suite:** Required actions produce log entries; log rows cannot be updated/deleted.

### 12.3 Test Data
- Synthetic data only in local, CI and staging. **No production data leaves production.**

### 12.4 AI Evaluation
- **Model selection eval (before build commit):** Candidate open-weight models scored on (a) 50+ NDPA Q&A questions with expected citations, prepared by the founder/Secretary; (b) drafting quality for DPIA sections, privacy notices and breach notices, rated by a DPO; (c) refusal behaviour on out-of-scope questions.
- **Regression eval in CI (nightly):** Same golden set; fails if citation accuracy or refusal accuracy drops below agreed thresholds (PRD success target: ≥ 90% accurate).
- **Gap rules:** Seeded test client containing every FR12.2 gap type must return all of them (deterministic, runs on every build).

---

## 13. Environments and Deployment

### 13.1 Environments
| Environment | Where | Data | Notes |
|---|---|---|---|
| **Local** | Developer machine, Docker Compose | Synthetic | Postgres+pgvector, S3-compatible emulator, Mailpit (email catcher), ClamAV, and either a small local model or a stub AI server returning fixtures |
| **Staging** | Nigeria, same provider as production, smaller sizes | Synthetic only | Full stack including GPU inference (can be scaled down or scheduled on/off to save cost) |
| **Production** | Nigeria | Real | Two web instances, one worker, database with replica or managed HA, GPU inference server, object storage |

Because staging contains no real data, it could run outside Nigeria to save cost, but keeping it on the same provider is recommended so deployments are rehearsed on identical infrastructure.

### 13.2 Deployment Approach
- **Build:** GitHub Actions runs lint, type-check, unit + integration tests, builds one Docker image, pushes to registry.
- **Deploy to staging:** Automatic on merge to `main`; runs migrations, then Playwright E2E + isolation suite against staging.
- **Deploy to production:** Manual approval of the same image tag. Migrations run first (backwards-compatible, expand/contract pattern), then rolling restart of web instances, then worker.
- **Runtime:** Docker Compose (or systemd-managed containers) on VMs, provisioned with a small Terraform or Ansible setup depending on the provider's tooling. No Kubernetes in V1.
- **Rollback:** Redeploy previous image tag; migrations are additive so old code still runs.
- **Content updates (F18):** Published by the Secretary through the app; no deploy needed (NFR11).
- **Observability:** Structured JSON logs (no prompt or document content) shipped to a self-hosted log store in Nigeria (e.g. Grafana Loki) with Grafana dashboards and alerts; self-hosted error tracking (GlitchTip) optional; external uptime monitor on `/health`.

---

## 14. Flags — Requirements at Risk or Not Satisfiable by the Proposed Stack

| Flag | PRD requirement | Issue | What's needed |
|---|---|---|---|
| **FLAG-1** | NFR5 (AI processing in Nigeria), F11–F13 | Nigerian GPU capacity is only now coming online in 2026. Availability, price, and contract terms for a production GPU server in Nigeria are unverified. | Vendor confirmation and a costed quote before build commit **[Q-2]**. If unavailable, AI features cannot launch without a founder-approved fallback **[Q-3]**. |
| **FLAG-2** | FR13 (≥ 90% accurate Q&A), FR11 drafting quality | Open-weight models that fit on one or two GPUs may be weaker than frontier API models, especially on legal reasoning. | Model evaluation (§12.4) must pass before committing. If none pass, scope or residency decision must change. |
| **FLAG-3** | NFR5 for files and backups | If the chosen provider has no S3-compatible storage in Nigeria (e.g. AWS object storage is regional and there is no AWS region in Nigeria), files must be self-hosted storage on local disks, which adds operating burden. | Confirm with provider **[Q-2]**. |
| **FLAG-4** | NFR13 backups, NFR12 availability | True disaster recovery needs a second, separate location. If both must be in Nigeria, a second Nigerian data centre (or second provider) is required. Single-site Nigerian power reliability is a known industry risk. | Budget for a second Nigerian backup location **[Q-4]**. |
| **FLAG-5** | NFR5 for email/SMS; FR7.6 alert timing | Email to Gmail/Outlook addresses always leaves Nigeria once delivered, and most reliable email relays are hosted abroad. SMS gateways' hosting location varies. Strict "no data leaves Nigeria" cannot be guaranteed for email. The 5-minute alert target depends on relay deliverability. | Accept minimal-content notices as compliant **[Q-5]**; in-app alert is the guaranteed channel. |
| **FLAG-6** | FR14.3 stronger client signature | OTP + hash + audit record gives strong evidence but is not a certificate-based or qualified e-signature. | Founder decision on signature method **[Q-1]**. |
| **FLAG-7** | FR13.3 "says so rather than guessing" | No LLM system can guarantee zero hallucination. Retrieval thresholds, citation validation and evals reduce the risk but do not eliminate it. | Accept as mitigated; human approval remains the control. |
| **FLAG-8** | NFR5 if AWS Lagos Local Zone is chosen | Local Zone resources sit in Lagos, but the control plane (management API, and regional services like S3 and secrets) runs from the Cape Town parent region; only a limited set of instance types is offered and GPU and managed database availability there are unconfirmed. | Verify service list for the Lagos Local Zone before choosing it **[Q-2]**. |

---

## 15. Reasons, Rejected Alternatives and Risks

### 15.1 Hosting Options (decision pending **[Q-2]**)
| Option | Pros | Cons |
|---|---|---|
| **AWS Local Zone (Lagos)** | Familiar tooling; compute and block storage physically in Lagos | Limited instance types; S3 and management plane in Cape Town (FLAG-3, FLAG-8); GPU availability unconfirmed |
| **Nigerian data centre / local cloud** (e.g. Rack Centre, MainOne/Equinix, Nxtra, MTN, Kasi Cloud) | Full data residency; emerging GPU offerings | Less managed tooling; more operations work; maturity varies by vendor |
| **Hybrid: Nigerian cloud for app + Nigerian GPU provider for AI** | Best fit for residency | Two vendors to manage |

**Recommendation:** Run a short vendor evaluation (VM, block storage, S3-compatible storage, managed Postgres if any, GPU availability, SLA, second site, price in naira vs dollars). The architecture is portable (containers + Postgres + S3 API + OpenAI-compatible inference API), so it can run on whichever vendor wins.

### 15.2 Major Choices and Rejected Alternatives
| Decision | Chosen | Rejected | Why |
|---|---|---|---|
| App structure | Modular monolith | Microservices | Small team and load; microservices add deployment and debugging cost with no requirement needing them |
| Frontend/backend | Next.js full-stack TypeScript | Separate React SPA + NestJS/Django API | One language, one deploy unit, shared validation; SPA would slow first load on mobile |
| Database | PostgreSQL | MongoDB, MySQL | Relational workflows, RLS for tenancy, pgvector for AI retrieval in one engine |
| Vector store | pgvector | Pinecone, Weaviate, Qdrant | Library is small; hosted vector DBs break residency; one fewer system to run |
| Job queue | pg-boss (Postgres) | Redis + BullMQ, RabbitMQ, Kafka | Job volume is low; avoids another stateful service |
| Auth | Better Auth (self-hosted) | Auth0, Clerk, Firebase, Keycloak | Hosted options store data abroad; Keycloak is a heavy separate server |
| AI | Self-hosted open-weight via vLLM | OpenAI/Anthropic/Google APIs, Azure OpenAI | Founder requirement that AI processing stays in Nigeria; no Nigerian region for these APIs is confirmed |
| Gap detection | Deterministic rules + AI explanation | Pure LLM detection | Testable, repeatable, explainable; required for acceptance criteria |
| Orchestration | Docker Compose on VMs | Kubernetes | Two app instances and one worker do not justify cluster management |
| Secrets | SOPS + age | Vault, cloud secrets manager | Vault is heavy; cloud secrets managers may sit outside Nigeria; SOPS works on any provider |
| Error tracking | Logs + optional self-hosted GlitchTip | Sentry SaaS | Error payloads can contain personal data |
| CDN/WAF | None in V1 | Cloudflare proxy | Would terminate TLS and see data outside Nigeria |

### 15.3 Technical Risks
| Risk | Impact | Mitigation |
|---|---|---|
| Nigerian GPU supply/price | AI features delayed or too costly | Vendor quotes before build; size model to one GPU; schedule staging GPU off-hours |
| Open-model quality | Poor drafts or Q&A | Eval gate; retrieval constraints; human approval; model swappable behind gateway |
| Single Nigerian site outage (power, network) | Downtime; breach deadlines at risk | Tier III+ DC; second-site backups; in-app status page; documented manual fallback for breach deadlines |
| Operating self-hosted components (Postgres, storage, inference) | Ops load on a small team | Prefer provider-managed Postgres/storage where available in Nigeria; runbooks; automated backups and restore tests |
| RLS misconfiguration | Cross-tenant leak | Two-layer authorisation; isolation test suite blocks release; pen test |
| Messy imports (F17) | Bad data, slow onboarding | Strict templates, dry-run preview, row-level errors |
| Scope size (F1–F18 all Must-have) | Long build | Deliver in internal milestones: (1) tenancy, clients, data map, RoPA; (2) DPIA, documents, approvals, export; (3) evidence/CAR, DSAR, breach, calendar, portal; (4) AI, import, content console |

---

## 16. Open Questions

1. **[Q-1] Client signature method (carried from PRD):** OTP + typed name + document hash (proposed), or a licensed/certificate-based e-signature provider?
2. **[Q-2] Hosting budget and operator:** What is the monthly infrastructure budget for the pilot, and who will operate the servers (in-house engineer, agency, or the hosting provider's managed service)? This decides between AWS Lagos Local Zone, a Nigerian cloud/colocation provider, or a hybrid.
3. **[Q-3] AI fallback (carried from PRD):** If no suitable GPU hosting or model is available in Nigeria, may AI features use anonymised/redacted data outside Nigeria, or must AI features wait?
4. **[Q-4] Disaster recovery:** Is a second Nigerian location for backups within budget? What maximum data loss (e.g. 15 minutes) and restore time (e.g. 4 hours) are acceptable?
5. **[Q-5] Email and SMS:** Do you accept that notification emails (with no compliance content) will reach recipients' mailboxes outside Nigeria? Which SMS provider, if SMS OTP is used?
6. **[Q-6] Evaluation data:** Can you (or the Secretary) prepare 50+ NDPA questions with correct answers and citations, and sample drafts rated by a DPO, before the model is selected?
7. **[Q-7] Build team:** How many developers, and what are their existing skills (TypeScript/Node, Python, DevOps)? This can change the recommended stack.
