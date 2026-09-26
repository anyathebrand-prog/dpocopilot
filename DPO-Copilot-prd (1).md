# DPO Copilot — Product Requirements Document (V1)

**Status:** Draft v1.3
**Owner:** Victor (Founder)
**Source:** DPO Copilot App Brief v0.1 + founder decisions
**Technical stack:** Not decided (out of scope for this document)

### Change log
| Version | Changes |
|---|---|
| v1.0 | First draft |
| v1.1 | Roles confirmed; DSAR tracker moved to Must-have; CAR readiness checklist defined; major-importance indicator tied to current NDPC guidance; Nigeria data residency required; Regulatory Content Secretary role added; client approval requires stronger signature; data import moved to Must-have; ALDPCON partnership added to launch plan |
| v1.3 | Added "Waiting for my review" queue on the dashboard for Lead Consultants and Firm Admins (FR2.4) |
| v1.2 | Policies map to NDPA only (other standards as optional tags); CAR checklist replaced with 5-category template; DSAR default set to 30 days; import covers all record types via Excel/CSV; Secretary confirmed as DPO Copilot staff |

---

## 1. Product Overview

DPO Copilot is a SaaS compliance workspace for Nigerian Data Protection Compliance Organisations (DPCOs). It turns the obligations of the Nigeria Data Protection Act (NDPA) 2023 into structured, repeatable workflows, and adds an AI copilot that drafts documents, spots compliance gaps, and answers regulatory questions using the client data already captured in those workflows.

V1 gives a DPCO firm one place to manage all its client organisations: onboarding, data mapping, Records of Processing Activities (RoPA), Data Protection Impact Assessments (DPIAs), policies, data subject requests, breach incidents, evidence, and Compliance Audit Return (CAR) readiness. Client organisations get a limited portal to view progress, upload evidence, and sign off documents.

### 1.1 Problem Being Solved

- **Manual, fragmented tooling.** DPCO teams run compliance on Word templates, Excel registers, email and WhatsApp. Work for each client is rebuilt from scratch.
- **No single source of truth.** A client's data map, RoPA, DPIAs and policies live in separate files that drift out of sync.
- **Deadline risk.** Time-critical obligations (the 72-hour breach notification window, data subject request deadlines, annual CAR filing) are tracked manually across many clients.
- **Slow evidence collection.** Chasing clients for documents over email and WhatsApp delays audits and leaves no clear record.
- **Generic AI is not enough.** General chat tools don't know the client's actual processing activities, the evidence on file, or Nigerian regulatory specifics, and their output is hard to defend.

---

## 2. Users

### 2.1 Primary User — DPCO Firm Team

| Role | Description | Key needs |
|---|---|---|
| **Firm Admin** | Owner or manager of the DPCO firm | Set up the workspace, manage team and permissions, see status across all clients |
| **Lead Consultant / DPO** | Senior practitioner accountable for client compliance | Run workflows, review and approve AI output, sign off documents, manage breaches and DSARs |
| **Associate / Analyst** | Junior team member doing day-to-day work | Data mapping, drafting, evidence collection, under a lead's review. Sees **only assigned clients** |

### 2.2 Secondary User — Client Organisation Contact

| Role | Key needs |
|---|---|
| **Client Contact** | View compliance status, complete questionnaires, upload evidence, review and sign off documents, report a suspected breach, log data subject requests received |

### 2.3 Internal User — Regulatory Content Secretary

| Role | Key needs |
|---|---|
| **Regulatory Content Secretary** (DPO Copilot staff) | Maintain the regulatory source library (NDPA 2023, NDPC directives and guidance), major-importance criteria, policy templates and the CAR checklist template, and publish updates to all firms |

> Roles and permissions confirmed by founder. The Secretary is DPO Copilot staff who maintains regulatory content for all firms; firm users cannot edit it.

---

## 3. Core User Outcome

**A DPCO team can take a new or existing client to an audit-ready compliance file (data map, RoPA, DPIAs, core policies, evidence, and CAR readiness) inside one workspace, faster than with their current manual process, with every AI-generated output reviewed and approved by a qualified person.**

---

## 4. Version-One Feature List

| # | Feature | Priority |
|---|---|---|
| F1 | Firm workspace, team members and role-based access | Must-have |
| F2 | Client management (multi-client dashboard) | Must-have |
| F3 | Client onboarding questionnaire and data mapping | Must-have |
| F4 | RoPA builder | Must-have |
| F5 | DPIA workflow | Must-have |
| F6 | Policy and notice generator | Must-have |
| F7 | Breach incident management | Must-have |
| F8 | Evidence vault and CAR readiness | Must-have |
| F9 | Tasks and compliance calendar | Must-have |
| F10 | Limited client portal | Must-have |
| F11 | AI copilot: drafting | Must-have |
| F12 | AI copilot: gap analysis | Must-have |
| F13 | AI copilot: regulatory Q&A | Must-have |
| F14 | Review, approval, signature and activity log | Must-have |
| F15 | Document export (PDF/Word) | Must-have |
| F16 | DSAR tracker | Must-have |
| F17 | Data import of existing client records | Must-have |
| F18 | Regulatory content management (Secretary) | Must-have |
| F19 | In-app and email notifications beyond critical alerts | Should-have |
| F20 | Firm branding on exported documents and client portal | Should-have |

---

## 5. User Stories

### F1 — Firm Workspace & Roles
- As a **Firm Admin**, I want to create my firm's workspace so my team can work in one shared place.
- As a **Firm Admin**, I want to invite team members and assign roles so each person only sees and does what they should.
- As a **Firm Admin**, I want to assign Associates to specific clients so work is clearly owned and access is limited.

### F2 — Client Management
- As a **Lead Consultant**, I want to add a new client organisation so I can start its compliance work.
- As a **Firm Admin**, I want a dashboard of all clients with their compliance status so I can see which clients need attention.
- As a **Lead Consultant**, I want one list of everything waiting for my review across all clients so nothing sits unapproved.

### F3 — Onboarding & Data Mapping
- As an **Associate**, I want to send a structured onboarding questionnaire to a client contact so I can gather information without email back-and-forth.
- As a **Client Contact**, I want to fill the questionnaire in the portal and save progress so I can complete it over several sessions.
- As a **Lead Consultant**, I want the answers to build a data inventory so the rest of the work is based on real data.
- As a **Lead Consultant**, I want the system to flag whether a client is likely a data controller or processor of major importance, based on current NDPC guidance, so I know which obligations apply.

### F4 — RoPA Builder
- As an **Associate**, I want processing activities created from the data inventory so I don't retype information.
- As a **Lead Consultant**, I want to edit, add and archive processing activities so the RoPA stays current.

### F5 — DPIA Workflow
- As a **Lead Consultant**, I want to start a DPIA linked to specific processing activities so the assessment reflects what the client actually does.
- As an **Associate**, I want a guided DPIA form so assessments are consistent across clients.
- As a **Lead Consultant**, I want to approve a DPIA and lock it as a version so there is a defensible record.

### F6 — Policy & Notice Generator
- As an **Associate**, I want to generate a draft Privacy Notice, Data Retention Policy and Consent Form pre-filled from the client's data map.
- As a **Client Contact**, I want to review and sign off policies in the portal so approval is recorded.

### F7 — Breach Incident Management
- As a **Client Contact**, I want to report a suspected breach through the portal so my DPCO knows immediately.
- As a **Lead Consultant**, I want a countdown to the 72-hour notification deadline so we don't miss it.
- As a **Lead Consultant**, I want draft notifications to the regulator and affected data subjects generated from the incident details.

### F8 — Evidence Vault & CAR Readiness
- As an **Associate**, I want to request specific evidence from a client so collection is tracked.
- As a **Client Contact**, I want to upload evidence against each request so I know what's still outstanding.
- As a **Lead Consultant**, I want a CAR readiness checklist and score for each client so I know if the client is ready to file.

### F9 — Tasks & Compliance Calendar
- As a **Lead Consultant**, I want to create and assign tasks with due dates so work is tracked.
- As a **Firm Admin**, I want a calendar of deadlines across all clients so nothing slips.

### F10 — Client Portal
- As a **Client Contact**, I want to see my organisation's status, open requests and documents awaiting sign-off so I know what to do.
- As a **Client Contact**, I want to only see my own organisation's information so our data stays private.

### F11 — AI Drafting
- As an **Associate**, I want the copilot to draft DPIA sections, policies, breach notices, DSAR responses and audit summaries from the client's structured data.
- As a **Lead Consultant**, I want every AI draft clearly marked until a qualified person approves it.

### F12 — AI Gap Analysis
- As a **Lead Consultant**, I want the copilot to flag compliance gaps for a client so I can prioritise work.

### F13 — AI Regulatory Q&A
- As an **Associate**, I want to ask questions about the NDPA and NDPC guidance and get answers with sources I can check.

### F14 — Review, Approval, Signature & Activity Log
- As a **Lead Consultant**, I want a review-and-approve step for key documents so quality is controlled.
- As a **Client Contact**, I want to sign off documents in a verifiable way so my approval holds up in an audit.
- As a **Firm Admin**, I want an activity log of who did what and when.

### F15 — Export
- As a **Lead Consultant**, I want to export approved documents and the RoPA so I can share or file them.

### F16 — DSAR Tracker
- As a **Client Contact**, I want to log a data subject request my organisation received so the DPCO can help us respond on time.
- As an **Associate**, I want each DSAR to show its type, deadline and status so none are missed.
- As a **Lead Consultant**, I want a draft response generated from the request and the client's data map.

### F17 — Data Import
- As a **Firm Admin**, I want to import my existing client records from spreadsheets so my team can start using the platform without retyping everything.

### F18 — Regulatory Content Management
- As the **Regulatory Content Secretary**, I want to add, update and retire regulatory documents, templates and checklist items, and publish them, so every firm works from current guidance.

---

## 6. Functional Requirements

### F1 — Firm Workspace & Roles
- FR1.1 A user can create a firm workspace and becomes its first Firm Admin.
- FR1.2 Firm Admin can invite users by email, assign one role (Firm Admin, Lead Consultant, Associate), change roles, and deactivate users.
- FR1.3 Firm Admin can assign Associates to clients. Associates see only assigned clients. Firm Admins and Lead Consultants see all clients in the firm.
- FR1.4 Permissions are enforced on every action and view, not only hidden in the interface.

### F2 — Client Management
- FR2.1 Firm users can create a client record (name, sector, size, contact persons, assigned team).
- FR2.2 Dashboard shows per client: overall status, open gaps, overdue tasks, active breaches, open DSARs, CAR readiness score.
- FR2.3 Clients can be archived (read-only), not hard-deleted, from the dashboard.
- FR2.4 Lead Consultants and Firm Admins see a "Waiting for my review" section on the dashboard listing every item In Review across the clients they can access (DPIAs, documents, breach notifications, DSAR responses), sorted by urgency, with a link to each item.

### F3 — Onboarding & Data Mapping
- FR3.1 A standard onboarding questionnaire covers: organisation details, data subject categories, personal data categories (including sensitive data), purposes, systems/storage, third-party recipients, cross-border transfers, retention, security measures, and any information needed to assess major-importance status.
- FR3.2 Firm users send the questionnaire to a Client Contact; the contact completes it in the portal with save-and-resume.
- FR3.3 Firm users can complete or edit answers on the client's behalf.
- FR3.4 Completed answers generate a structured data inventory.
- FR3.5 The system shows a major-importance indicator based on the criteria in **current NDPC guidance**, as maintained in the regulatory content library (F18), with its reasoning and source shown. A Lead Consultant sets the final classification.

### F4 — RoPA Builder
- FR4.1 System proposes RoPA entries from the data inventory.
- FR4.2 Each entry records at minimum: purpose, lawful basis, data subject categories, data categories, recipients, cross-border transfers, retention period, security measures, system/owner.
- FR4.3 Users can add, edit and archive entries; changes are logged.

### F5 — DPIA Workflow
- FR5.1 A DPIA is created against one or more RoPA entries.
- FR5.2 Guided steps: description of processing, necessity and proportionality, risk identification, risk scoring (likelihood × impact), mitigations, residual risk, conclusion.
- FR5.3 Status flow: Draft → In Review → Approved. Approved DPIAs are locked; edits create a new version.
- FR5.4 A review date can be set and appears on the calendar.

### F6 — Policy & Notice Generator
- FR6.1 V1 templates (confirmed): Privacy Notice, Data Retention Policy, Consent Form.
- FR6.2 Templates are pre-filled from the client's data inventory and RoPA.
- FR6.3 Documents are editable, versioned, and follow the approval and signature flow in F14.
- FR6.4 Policies and documents map to the relevant NDPA 2023 provisions. Other standards (e.g. ISO 27001, SOC 2, GDPR) can be added as optional reference tags only; they are not assessed in V1.

### F7 — Breach Incident Management
- FR7.1 Incidents can be logged by firm users or reported by a Client Contact through the portal.
- FR7.2 Each incident records: awareness time, description, data and subjects affected, estimated number affected, containment actions, severity, whether notification is required, and remediation actions.
- FR7.3 A live countdown shows time remaining to 72 hours from the recorded awareness time (WAT).
- FR7.4 System drafts a regulator notification and a data-subject notification (via F11).
- FR7.5 Users record when and how notifications were sent. The system does **not** submit notifications to the regulator.
- FR7.6 Client-reported incidents immediately alert the assigned firm team by email and in-app.

### F8 — Evidence Vault & CAR Readiness
- FR8.1 Firm users create evidence requests (title, description, due date, linked checklist item).
- FR8.2 Client Contacts upload files against requests; firm users accept or reject with a comment.
- FR8.3 Evidence is stored per client and linked to the checklist item or document it supports.
- FR8.4 Each client has a CAR readiness checklist created from the standard template (§6.1 below). Each item is marked Complete, In Progress, Missing, or Not Applicable (with reason).
- FR8.5 Overall readiness score = percentage of applicable items marked Complete, shown overall and per category.
- FR8.6 Where platform data already satisfies an item, the system links it automatically for the reviewer to confirm (e.g. approved policies → Governance; DPIAs and RoPA lawful bases → Accountability & Risk; RoPA transfer fields → Cross-Border Transfer; RoPA recipients → Data Processors).
- FR8.7 The system does **not** file the CAR with the regulator in V1.

#### 6.1 CAR Readiness Checklist — Standard Template

The checklist has five categories (confirmed by founder). **The items under each category are proposed drafts for founder confirmation (see §13, question 3).**

**1. People and Process (Governance)**
- Data Protection Officer designated and documented
- Data protection policies and procedures approved and current
- Privacy notice published
- Staff data protection training records
- Data subject request procedure in place
- Breach response procedure in place
- RoPA current and maintained

**2. Technology (Data Security Controls and Standards)**
- Encryption of personal data at rest and in transit
- Access controls and periodic user access reviews
- Backup and recovery arrangements
- Retention and deletion schedule applied
- Security incident logging and monitoring

**3. Accountability and Basic Risk Evaluation**
- Lawful basis documented for each processing activity
- DPIAs completed for high-risk processing
- Risk register with mitigation plans
- Evidence of periodic compliance reviews
- Prior audit findings closed out
- Major-importance status assessed and NDPC registration completed where applicable

**4. Cross-Border Data Transfer**
- Inventory of personal data transferred outside Nigeria
- Legal basis or safeguard documented for each transfer
- Records of transfers maintained

**5. Data Processors**
- List of data processors and what they process
- Contracts with processors include data protection clauses
- Due diligence or risk assessment records for key processors

> The template is maintained by the Regulatory Content Secretary (F18). Firms can mark items Not Applicable per client but cannot delete template items.

### F9 — Tasks & Compliance Calendar
- FR9.1 Users create tasks with title, client, assignee, due date and status.
- FR9.2 System auto-creates dated items for: breach deadlines, DSAR deadlines, DPIA review dates, evidence due dates, CAR filing date.
- FR9.3 Calendar filterable by client and assignee.

### F10 — Client Portal
- FR10.1 Firm users invite Client Contacts per client; contacts access only their own organisation.
- FR10.2 Portal shows: status summary, questionnaires, evidence requests, documents awaiting sign-off, approved documents, "report a breach" and "log a data subject request" actions.
- FR10.3 Client Contacts cannot see internal notes, AI chat, gap analysis details, or unshared drafts.

### F11 — AI Copilot: Drafting
- FR11.1 Copilot drafts: DPIA sections, policies/notices, breach notifications, DSAR responses, audit report drafts and executive summaries.
- FR11.2 Drafts use the specific client's structured data.
- FR11.3 All AI output is labelled "AI draft" until approved by a Lead Consultant.
- FR11.4 Nothing AI-generated is sent to a client or exported as final without approval.

### F12 — AI Copilot: Gap Analysis
- FR12.1 Gap check runs on request and returns gaps with severity, linked record and suggested next action.
- FR12.2 V1 gap rules include at least: processing activity with no lawful basis; sensitive or high-risk processing with no DPIA; RoPA entry with no retention period; missing required policies; cross-border transfer with no documented safeguard; overdue evidence requests; DSARs near or past deadline; CAR checklist items marked Missing.
- FR12.3 Users can mark a gap resolved or "not applicable" with a reason.

### F13 — AI Copilot: Regulatory Q&A
- FR13.1 Firm users ask natural-language questions about the NDPA 2023 and NDPC guidance.
- FR13.2 Answers are grounded in the regulatory source library (F18) and show citations (document and section).
- FR13.3 If the library does not support an answer, the copilot says so rather than guessing.
- FR13.4 Every answer shows a "guidance, not legal advice" notice.
- FR13.5 Client Contacts have no Q&A access in V1.

### F14 — Review, Approval, Signature & Activity Log
- FR14.1 DPIAs, policies/notices, breach notifications and DSAR responses follow: Draft → In Review → Approved (firm) → optionally Client Signed Off.
- FR14.2 Only Lead Consultants and Firm Admins can give firm approval.
- FR14.3 Client sign-off requires a stronger signature than a simple click, capturing signer identity verification, name, date and time, and a record of exactly which document version was signed. *Signature method to be confirmed (see §13, question 1).*
- FR14.4 A signed document version cannot be altered; changes create a new version that needs a new signature.
- FR14.5 System logs create/edit/approve/sign/export/delete actions, logins, and AI generations with user and timestamp. Firm Admin can view and filter the log.

### F15 — Export
- FR15.1 Approved documents, the RoPA, and the CAR readiness checklist export to PDF and Word.
- FR15.2 Exports include client name, document version, approval date and signature details where signed.

### F16 — DSAR Tracker
- FR16.1 DSARs can be logged by firm users or by Client Contacts through the portal.
- FR16.2 Each DSAR records: request type (e.g. access, rectification, erasure, objection, portability), date received, requester details, identity verification status, related processing activities, status, and response.
- FR16.3 Response deadline defaults to **30 days** from date received. The period is a platform setting maintained by the Regulatory Content Secretary (F18).
- FR16.4 DSARs appear on the calendar and dashboard; approaching and overdue deadlines are flagged.
- FR16.5 Copilot drafts a response (via F11), which follows the approval flow in F14.
- FR16.6 Closed DSARs remain as a record and feed the client's evidence file.

### F17 — Data Import
- FR17.1 Firm Admins can import existing records using downloadable **Excel and CSV** templates.
- FR17.2 Import validates each row, shows errors before anything is saved, and lets the user fix or skip rows.
- FR17.3 Imported records are marked as imported in the activity log.
- FR17.4 V1 imports all of: clients and contacts, RoPA entries, past DPIAs, existing policies, and evidence files.
- FR17.5 Structured records (clients, contacts, RoPA entries, DPIA register details) import from Excel/CSV rows. Documents (past DPIAs, policies, evidence files) import as a bulk file upload with an Excel/CSV index that links each file to its client and document type or checklist item.

### F18 — Regulatory Content Management
- FR18.1 The Secretary can add, update, version and retire: regulatory source documents, major-importance criteria, DSAR deadline settings, policy templates, and the CAR checklist template.
- FR18.2 Changes are drafted, then published; firms always see the latest published version.
- FR18.3 Each published change records what changed, when, and by whom.
- FR18.4 Q&A citations and major-importance reasoning reference the version of the source used.

---

## 7. Non-Functional Requirements

### 7.1 Security, Privacy & Data Residency
- NFR1 Data encrypted in transit and at rest.
- NFR2 Strict tenant isolation between firms and between clients of the same firm.
- NFR3 Multi-factor authentication available for all users; mandatory for Firm Admins *(proposed)*.
- NFR4 Role-based access enforced server-side.
- NFR5 **All client data, uploaded files, backups, and AI processing must stay in Nigeria in V1** (founder decision).
- NFR6 Client data is not used to train AI models.
- NFR7 DPO Copilot complies with the NDPA as a data processor for its customers: data processing agreement for firms, privacy notice, and breach procedures for the platform itself.
- NFR8 Uploaded and imported files are scanned for malware and restricted to allowed types and sizes.

### 7.2 AI Quality & Safety
- NFR9 AI output is always reviewable, editable and logged as AI-generated.
- NFR10 Regulatory Q&A shows citations for every answer.
- NFR11 Regulatory content updates publish without a full product release.

### 7.3 Reliability & Performance *(proposed targets)*
- NFR12 99.5% availability during business hours (WAT).
- NFR13 Regular automated backups with a tested restore process, stored in Nigeria.
- NFR14 Standard pages load in under 3 seconds on typical Nigerian broadband/4G.
- NFR15 AI features show progress and fail gracefully with a clear message.

### 7.4 Usability & Access
- NFR16 Firm workspace works on desktop browsers; client portal fully usable on mobile browsers.
- NFR17 Core flows meet WCAG 2.1 AA *(proposed)*.
- NFR18 All deadlines and countdowns use West Africa Time (WAT).

---

## 8. Acceptance Criteria

**F1 — Firm Workspace & Roles**
- A new user who creates a firm becomes Firm Admin and sees an empty client dashboard.
- An Associate not assigned to Client X is denied access to Client X, including by direct link.
- A Lead Consultant can see all clients in the firm.
- A deactivated user cannot log in.

**F2 — Client Management**
- A new client appears on the dashboard with status "Onboarding" and zero readiness.
- Dashboard counts match the underlying records.
- Any item sent for review appears in "Waiting for my review" for Lead Consultants and Firm Admins, and disappears once approved.
- Breach notifications appear at the top of the review list; Associates do not see the review section.

**F3 — Onboarding & Data Mapping**
- A Client Contact who saves partway finds previous answers preserved on return.
- A completed questionnaire creates a data inventory with no manual retyping.
- The major-importance indicator shows its reasoning and cites the NDPC guidance version used; only a Lead Consultant can finalise the classification.

**F4 — RoPA Builder**
- Proposed entries contain all required fields, with empty fields flagged.
- Every edit appears in the activity log.

**F5 — DPIA Workflow**
- A DPIA cannot be created without at least one linked RoPA entry.
- Editing an Approved DPIA creates a new draft version; the prior version stays viewable.

**F6 — Policy & Notice Generator**
- Drafts contain client details drawn from the inventory and RoPA.
- A document sent for sign-off appears only in that client's portal.

**F7 — Breach Incident Management**
- A client-reported breach alerts the assigned firm team within 5 minutes *(proposed)* and appears on the dashboard.
- The countdown shows the correct time remaining to 72 hours in WAT.
- Generated notifications are marked "AI draft" until approved.

**F8 — Evidence Vault & CAR Readiness**
- Every new client gets the full standard checklist (all 5 categories).
- An uploaded file changes the request status to "Submitted".
- Rejecting evidence requires a comment visible to the client.
- Marking an item Not Applicable requires a reason and removes it from the score calculation.
- The score updates immediately when any item's status changes, overall and per category.

**F9 — Tasks & Calendar**
- Breach, DSAR, DPIA review, evidence and CAR dates appear automatically.
- Overdue items are flagged and counted on the dashboard.

**F10 — Client Portal**
- A Client Contact for Client A cannot view any Client B data, including by altering a URL.
- Internal notes, AI chat and unshared drafts are not visible to Client Contacts.
- Questionnaire, upload, sign-off, breach report and DSAR logging work on a mobile browser.

**F11 — AI Drafting**
- Every AI draft is labelled until approved and cannot be exported as final or sent to a client without approval.
- Drafts reference the specific client's data (spot-checked in QA).

**F12 — AI Gap Analysis**
- A test client seeded with each V1 gap type returns every one of them.
- Each gap links to its related record.

**F13 — AI Regulatory Q&A**
- Every answer shows at least one citation or states the library does not cover the question.
- Every answer shows the "not legal advice" notice.
- Client Contacts cannot access Q&A.

**F14 — Review, Approval, Signature & Activity Log**
- An Associate cannot give firm approval.
- A client sign-off records verified signer identity, name, timestamp and document version.
- Changing a signed document creates a new unsigned version.
- Approve, sign, export and AI-generation actions are logged.

**F15 — Export**
- Exports open correctly in standard PDF readers and Microsoft Word and show client name, version, approval date and signature details.

**F16 — DSAR Tracker**
- A Client Contact can log a DSAR from the portal; it appears on the firm dashboard.
- The deadline is calculated automatically as 30 days from date received (or the current published setting if changed).
- DSARs approaching or past their deadline are flagged on dashboard and calendar.
- DSAR responses cannot be marked sent until approved.

**F17 — Data Import**
- A valid template file imports all rows correctly.
- Invalid rows are listed with the reason before saving; nothing is saved until the user confirms.
- Imported records are logged as imported.
- Bulk-uploaded files are linked to the client and document type or checklist item named in the index file; unmatched files are listed before saving.

**F18 — Regulatory Content Management**
- Only the Secretary can edit regulatory content; firm users cannot.
- A published update is visible to all firms without a product release.
- Every change records who, when and what.

---

## 9. Scope

### 9.1 Included in V1
Features F1–F18 (Must-have) for DPCO firms serving multiple clients, with a limited client portal, NDPA 2023 only, English only, all data and AI processing hosted in Nigeria.

### 9.2 Should-have (V1 if capacity allows, else V1.1)
- F19 Notifications beyond critical alerts (breach alerts are Must-have under F7)
- F20 Firm branding on exports and portal

### 9.3 Excluded from V1
- Direct filing of CAR, breach notifications or other returns with the regulator
- GDPR or other non-Nigerian frameworks as full workflows
- Solo-DPO and in-house (single-organisation) plans
- Client Contact access to AI features
- Billing, invoicing and time tracking for firms
- Staff training / e-learning module (training records are collected as evidence only)
- Full vendor risk management module (vendor items are collected as evidence only)
- Integrations with client systems (automated data discovery)
- Native mobile apps
- Languages other than English

### 9.4 Possible Later Additions
- GDPR and other frameworks for clients with international exposure
- Solo DPO and in-house compliance plans
- Vendor/processor assessment module and DPA management
- Staff privacy-awareness training (possible link with a learning platform)
- Consent management
- More policy templates
- Client reminders via WhatsApp
- Firm-level analytics and reporting
- Regulator submission support if an official channel allows it

---

## 10. Success Criteria

*Proposed targets — confirm before launch.*

**Pilot (first 3 months)**
- 3–5 DPCO firms, recruited through the ALDPCON partnership, actively using V1 with real clients.
- Each pilot firm imports or onboards at least 3 client organisations.
- At least one client per pilot firm reaches 100% CAR readiness in the platform.

**Efficiency**
- Pilot firms report taking a client to an audit-ready file at least 40% faster than before.
- At least 60% of AI drafts are approved with light edits rather than discarded.

**Quality & Trust**
- Zero cross-tenant or cross-client data exposure incidents.
- Zero missed breach or DSAR deadlines for items logged in the platform.
- Regulatory Q&A answers rated accurate by Lead Consultants at least 90% of the time.

**Engagement**
- At least 50% of invited Client Contacts complete at least one portal action.

---

## 11. Assumptions

1. V1 targets DPCO firms with small teams (roughly 2–15 users) managing multiple clients.
2. V1 covers the NDPA 2023 and current NDPC guidance only.
3. A Lead Consultant approves all AI output before external use.
4. The platform supports, but does not replace, professional judgement or legal advice.
5. The platform does not submit anything to the regulator.
6. Major-importance criteria follow current NDPC guidance and the DSAR default is 30 days; both are kept current by the Regulatory Content Secretary (DPO Copilot staff).
7. Pricing and packaging are decided separately.
8. The ALDPCON partnership is part of the launch and pilot recruitment plan.

## 12. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Nigeria-only AI processing limits model options** | Few AI providers can guarantee processing inside Nigeria; this could delay launch or reduce AI quality | Validate in-country AI hosting options early, before committing to the build plan; agree a fallback (see §13, question 2) |
| AI produces inaccurate regulatory content | Wrong advice; reputational and legal exposure | Citations required, curated library, mandatory approval, "not legal advice" notices |
| Platform holds sensitive client data | Severe impact if breached | Security NFRs, isolation testing, penetration test before launch |
| Regulatory changes | Templates, criteria and Q&A go stale | Secretary role with versioned, publishable content (F18) |
| **V1 scope has grown** (DSAR, import, signature and content management now Must-have) | Longer build; delayed pilot | Keep F19–F20 deferred; phase internal delivery; pilot with a small ALDPCON cohort |
| Import of messy existing spreadsheets | Bad data enters the platform; slow onboarding | Strict templates, row validation, error preview |
| Low client-contact adoption of the portal | Evidence collection falls back to WhatsApp | Mobile-first portal, minimal steps, reminders |
| Signature method not accepted by clients or auditors | Sign-offs may not be relied on | Confirm method with pilot firms before build (§13, question 1) |

## 13. Unresolved Questions

1. **Client signature method:** What form should the stronger sign-off take? For example, typed or drawn signature with a one-time code sent by email or SMS, or integration with a licensed e-signature provider?
2. **Nigeria-only AI processing:** If no suitable AI model can run inside Nigeria, is any fallback acceptable (e.g. sending only anonymised or redacted data outside Nigeria), or must AI features wait?
3. **CAR checklist items:** Confirm, edit or replace the proposed items under each of the five categories in §6.1.
4. **Pilot cohort:** How many ALDPCON member firms will pilot V1, and when? *(Founder: not decided yet.)*
