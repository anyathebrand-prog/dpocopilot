# DPO Copilot — Product Requirements Document (V1)

**Status:** Draft v1.5 (updated to match the product as built, 10 October 2026)
**Owner:** Victor (Founder)
**Source:** DPO Copilot App Brief v0.1 + founder decisions + build to date
**Technical stack:** Next.js 16 web app; PostgreSQL 16 (embedded PGlite in development); one Docker install per DPCO on Kasi Cloud (Nigeria) with Caddy (HTTPS) and ClamAV (upload scanning). See §7.5.

### Change log
| Version | Changes |
|---|---|
| v1.0 | First draft |
| v1.1 | Roles confirmed; DSAR tracker moved to Must-have; CAR readiness checklist defined; major-importance indicator tied to current NDPC guidance; Nigeria data residency required; Regulatory Content Secretary role added; client approval requires stronger signature; data import moved to Must-have; ALDPCON partnership added to launch plan |
| v1.2 | Policies map to NDPA only (other standards as optional tags); CAR checklist replaced with 5-category template; DSAR default set to 30 days; import covers all record types via Excel/CSV; Secretary confirmed as DPO Copilot staff |
| v1.3 | Added "Waiting for my review" queue on the dashboard for Lead Consultants and Firm Admins (FR2.4) |
| v1.4 | Brought in line with the build. CAR checklist is now the GAID Schedule 2 audit questionnaire (69 questions) per audit year, with risk scoring, recommendations and other findings (§6.1 replaced). DPIAs follow the NDPC 12-point guide and produce a GAID-format report. New features F21–F31: LIA, cross-border transfer and third-party (processor) risk assessments; CAR audit report and remediation tracker; Data Protection Framework generator; capacity building plan; billing (invoices and receipts); proposal and cover letter generator; project plan; report cover letters; Solo DPO / DPCO Firm plans; public blog; single-firm install per DPCO. Onboarding expanded (departments, DPO and CDPO certificate, company profile, organogram). Exports are native Word (.docx). Client signature method settled (typed name + one-time code). Security requirements updated (§7.1). Exclusions and open questions revised. |
| v1.5 | CAR readiness split into Section A (Parts 1–5) and Section B (audit work plan by department, with observations); Part 6 removed. Tasks gain Project Name, Activity, Sub-activity and a Professional Fee Payable visible to the assignee. DSARs move to the client: the portal verifies the requester's identity, assigns a department and emails the requester and department; DSARs removed from the DPCO dashboards. DSAR response period restored to 30 days. New: firm regulatory library (F32), audit readiness letter on payment (F33), compliance audit notification letters (F34), client incident register (F35); portal rebuilt in the workspace layout. Required fields marked with an asterisk. Security hardening (headers, DB-backed lockout, patched dependencies). |

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

> Roles and permissions confirmed by founder. The Secretary is DPO Copilot staff who maintains regulatory content for all firms; firm users cannot edit it. The Secretary also writes the public blog and sets each firm's plan (F29, F30).

### 2.4 Plans
| Plan | Who | Difference |
|---|---|---|
| **DPCO Firm** | Licensed compliance firms serving many clients | Every feature, team seats with Admin, Lead and Associate roles, spreadsheet import |
| **Solo DPO** | Independent DPOs managing a few clients | One seat: no team invitations and no spreadsheet import; everything else included |

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
| F19 | In-app and email notifications beyond critical alerts | Should-have (CAR reminders, invoice and receipt notices built) |
| F20 | Firm branding on exported documents and client portal | Built (firm logo, letterhead; install branding in F31) |
| F21 | Assessments: Legitimate Interest (LIA), Cross-Border Transfer Risk (TIA), Data Processor Third-Party Risk (TPRA) | Built |
| F22 | CAR audit report and remediation tracker | Built |
| F23 | Data Protection Framework generator | Built |
| F24 | Capacity building plan (training schedule and evidence) | Built |
| F25 | Billing: invoices and receipts per client | Built |
| F26 | Proposal and service agreement generator with cover letter | Built |
| F27 | Project plan per client (tasks timeline) | Built |
| F28 | Cover letters for client reports | Built |
| F29 | Plans: Solo DPO and DPCO Firm | Built |
| F30 | Public blog (Secretary) | Built |
| F31 | Single-firm install per DPCO (own server and domain) | Built |
| F32 | Regulatory library in the firm workspace (read-only, PDF/Word) | Built |
| F33 | Data Protection Audit Readiness Letter, drafted when an invoice is paid | Built |
| F34 | Compliance Audit Notification Letters to all clients, invoice attached | Built |
| F35 | Client Data Privacy Incident Register | Built |

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

### F21 — Assessments (LIA, TIA, TPRA)
- As a **Lead Consultant**, I want to run a Legitimate Interest Assessment on an activity that relies on legitimate interest, so the basis is documented the way the GAID expects.
- As a **Lead Consultant**, I want to assess each transfer of personal data outside Nigeria and each data processor, rate the risk and record an outcome, so transfers and vendors are defensible.

### F22 — CAR Audit Report & Remediation Tracker
- As a **Lead Consultant**, I want to generate the compliance audit report from the CAR checklist, so the Compliance Audit Return is ready to file.
- As a **Lead Consultant**, I want a remediation tracker built from the audit findings, with owners and target dates, so the client can close the gaps.

### F23 — Data Protection Framework
- As a **Lead Consultant**, I want a Data Protection Framework drafted from the client's structure, departments, RoPA and company documents, so each client gets a tailored policy set.

### F24 — Capacity Building Plan
- As a **Lead Consultant**, I want to schedule each data protection training for a client and attach evidence once it is held, so training is provable at audit.

### F25 — Billing
- As a **Firm Admin**, I want to invoice a client for the services we deliver and issue a receipt when paid, so billing sits beside the work.
- As a **Client Contact**, I want to see and download my invoices and receipts in the portal.

### F26 — Proposals
- As a **Firm Admin**, I want to generate a branded proposal, service agreement and cover letter for a prospective client, so winning new work is quick and consistent.

### F27 — Project Plan
- As a **Lead Consultant**, I want a project plan with a timeline built from a client's tasks, so the client sees the engagement schedule.

### F28 — Report Cover Letters
- As a **Lead Consultant**, I want a cover letter for every report I send a client, so each deliverable goes out formally.

### F29 — Plans
- As the **Regulatory Content Secretary**, I want to set each firm's plan (Solo DPO or DPCO Firm), so features match what the firm pays for.

### F30 — Public Blog
- As the **Regulatory Content Secretary**, I want to publish articles and downloadable resources on the public site, so DPCOs find and trust DPO Copilot.

### F31 — Single-Firm Install
- As a **DPCO**, I want DPO Copilot on my own domain with my brand, so my clients see my firm, not a shared platform.

### F32 — Firm Regulatory Library
- As a **Lead Consultant**, I want to read and download the regulatory texts the platform answers from, so I can check the source myself.

### F33 — Audit Readiness Letter
- As a **Lead Consultant**, I want an audit readiness letter drafted as soon as the client pays, so fieldwork can be scheduled straight away.

### F34 — Compliance Audit Notification Letters
- As a **Firm Admin**, I want to notify all my clients at once to prepare for next year's audit and CAR, each with their invoice attached.

### F35 — Client Incident Register
- As a **Client Contact**, I want to keep our own register of privacy incidents with the 72-hour NDPC deadline tracked, so we can show the regulator our incident handling.

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
- FR3.6 The questionnaire is in steps, each saved before moving on. Organisation details are split into two steps of ten questions: (1) registered name, address, phone, email, website, branch (optional), sector, staff count, number of departments, list of departments; (2) company documents and DPO.
- FR3.7 Company documents: company profile (PDF or Word) and company structure / organogram (PDF, Word or PNG/JPEG). Text is extracted for use in the Data Protection Framework (F23); image organograms are embedded in it.
- FR3.8 DPO details: name, phone, email and CDPO certificate (PDF). The certifying body, certificate number, issue and expiry dates are read from the certificate automatically for the user to confirm; scanned (image-only) certificates are attached and the fields typed.

### F4 — RoPA Builder
- FR4.1 System proposes RoPA entries from the data inventory.
- FR4.2 Each entry records at minimum: purpose, lawful basis, data subject categories, data categories, recipients, cross-border transfers, retention period, security measures, system/owner.
- FR4.3 Users can add, edit and archive entries; changes are logged.
- FR4.4 Each entry is tied to a department chosen from the client's onboarding list of departments.

### F5 — DPIA Workflow
- FR5.1 A DPIA is created against one or more RoPA entries.
- FR5.2 Guided steps follow the NDPC 12-point DPIA guide (screening; organisation and purpose; method; legal grounds; necessity of the means; stakeholders; risks to confidentiality, integrity and availability incl. data-subject inadvertence; harm to data subjects; transfers outside Nigeria; principles and rights; risks identified; measures per risk) plus outcome and review. Each step shows the guide instruction and opens pre-filled from the client's records.
- FR5.3 Status flow: Draft → In Review → Approved. Approved DPIAs are locked; edits create a new version.
- FR5.4 A review date can be set and appears on the calendar.
- FR5.5 Each DPIA records its assessment year; the DPIA list can be filtered by year.
- FR5.6 Risks use a 5×5 likelihood × impact scale: Low 1–4, Medium 5–9, High 10–15, Critical 16–25, with inherent and residual ratings.
- FR5.7 "Generate DPIA report" produces the report in the GAID DPIA report format (cover, document control, executive summary, screening, methodology, processing inventory, necessity and proportionality, risk register, heat map, treatment, residual risk and DPO opinion, action plan, sign-off with the NDPC prior-consultation decision). Facts not held show as [To be confirmed].

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

### F7a — CAR Filing Reminders
- FR7.7 A daily job emails each client's active contacts 30, 14, 7 and 1 day(s) before the CAR filing date and on the day, and alerts the firm team in-app. Each stage sends once per due date. The portal shows a CAR banner inside the 30-day window.

### F8 — Evidence Vault & CAR Readiness
- FR8.1 Firm users create evidence requests (title, description, due date, linked checklist item).
- FR8.2 Client Contacts upload files against requests; firm users accept or reject with a comment.
- FR8.2a Both sides can also "Upload documents" without a request, several files at once: from the portal they arrive as Submitted (firm notified); from the firm side they are filed as Accepted, optionally against a CAR item.
- FR8.2b Allowed files: PDF, Word, Excel, CSV, text and photos up to 25 MB; videos (MP4, MOV, WebM) up to 100 MB.
- FR8.3 Evidence is stored per client and linked to the checklist item or document it supports.
- FR8.3a The CAR readiness page is in two sections: **Section A** holds checklist Parts 1–5; **Section B** is the audit work plan by department (FR8.8). Part 6 (data processors) is removed from the checklist, every score and export, and new checklists; stored Part 6 answers are kept but hidden. Processors are assessed under Third-party risk (F21).
- FR8.4 Each client has one CAR readiness checklist **per audit year**, created from the standard template (§6.1 below). Each item is marked Complete, In Progress, Missing, or Not Applicable, and records the answer, the evidence seen, a Non-Conformity/Observation note (required for Not Applicable) and a recommendation. A year with no checklist says so and offers to start one; any recorded year can be made the active year.
- FR8.5 Overall readiness score = percentage of applicable items marked Complete, shown overall and per category. A risk score (0–100, High/Medium/Low) follows item status and question priority (High-priority questions weigh double).
- FR8.5a Consultants record other high-risk findings and observations the questions don't cover (observation, risk, Open/Resolved, recommendation), per audit year.
- FR8.6 Where platform data already satisfies an item, the system links it automatically for the reviewer to confirm (e.g. approved policies → Governance; DPIAs and RoPA lawful bases → Accountability & Risk; RoPA transfer fields → Cross-Border Transfer; RoPA recipients → Data Processors).
- FR8.7 The system does **not** file the CAR with the regulator in V1.
- FR8.8 **Audit work plan (Section B):** a dropdown lists the client's departments, taken from the organogram's text (unit names and "Head, X" titles) and then the onboarding department list. Choosing a department shows its work plan from the DPCO's CAR Audit Work Plan template: 22 base controls (CAR area, GAID/NDPA reference, objective, procedure, evidence, risk) worded for the department using its RoPA activities, plus the controls specific to the closest matching unit in the template. Auditors record an **Observation** per control, saved per audit year; the plan exports to PDF/Word.

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
- FR9.1 Users create tasks with client, **Project Name**, **Activity** and **Sub-activity** (all required), assignee, start date, due date and status (due date cannot precede start date). Completion date is recorded.
- FR9.4 Firm Admins and Lead Consultants can set a **Professional Fee Payable** per task. It is shown to the task's assignee and to Admins/Leads only, and never appears on client-facing exports.
- FR9.2 System auto-creates dated items for: breach deadlines, DSAR deadlines, DPIA review dates, evidence due dates, CAR filing date.
- FR9.3 Calendar filterable by client and assignee.

### F10 — Client Portal
- FR10.1 Firm users invite Client Contacts per client; contacts access only their own organisation.
- FR10.0 The portal uses the same layout as the firm workspace: sidebar with icon navigation and attention counts, top bar with account and sign out.
- FR10.2 Portal shows: status summary, questionnaires, evidence requests and "Upload documents", documents awaiting sign-off, approved documents, a read-only CAR checklist (with recommendations and other findings), the client's active RoPA (data inventory), upcoming deadlines, invoices and receipts, and "report a breach" and "log a data subject request" actions.
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
- FR14.3 Client sign-off requires a stronger signature than a simple click, capturing signer identity verification, name, date and time, and a record of exactly which document version was signed. **Method (built):** the signer types their name and enters a one-time code sent to them; the export seal shows signer, time, code channel and the SHA-256 fingerprint of the signed version.
- FR14.4 A signed document version cannot be altered; changes create a new version that needs a new signature.
- FR14.5 System logs create/edit/approve/sign/export/delete actions, logins, and AI generations with user and timestamp. Firm Admin can view and filter the log.

### F15 — Export
- FR15.1 Approved documents, the RoPA, and the CAR readiness checklist export to PDF and Word. So do the DPIA report, LIA/TIA/TPRA assessments, CAR audit report, remediation plan (plus Excel tracker), Data Protection Framework, capacity building plan, project plan, invoices, receipts and proposals.
- FR15.2 Exports include client name, document version, approval date and signature details where signed.
- FR15.3 PDF is print-ready HTML with a running header and page numbers; Word is a native .docx with the same content and styling (headings, shaded tables, risk colours, charts, page breaks, header/footer, logos).

### F16 — DSAR Tracker
- FR16.1 DSARs are logged by Client Contacts through the portal (the firm-side DSAR pages remain but are no longer on the DPCO dashboards).
- FR16.1a On "Send request", the requester is emailed: "Thank you for your request, consistent with the requirement of the NDP Act and our internal policy, your request will be treated with dispatch."
- FR16.1b **Verify & assign:** the client records the identity check (result, method, notes) and the department to execute the request. Choosing a department requires its email; the department is emailed to attend to the request promptly.
- FR16.1c Once identity is verified, the client attaches evidence of response and submits; the requester is emailed that the request is completed, with the evidence attached, and the request closes.
- FR16.2 Each DSAR records: request type (e.g. access, rectification, erasure, objection, portability), date received, requester details, identity verification status, related processing activities, status, and response.
- FR16.3 Response deadline defaults to **30 days** from the date received (briefly 72 hours; restored to 30 days). The period is a platform setting maintained by the Regulatory Content Secretary (F18).
- FR16.4 DSAR deadlines appear on the calendar; the portal flags requests awaiting verification or assignment.
- FR16.5 Copilot drafts a response (via F11), which follows the approval flow in F14.
- FR16.6 Closed DSARs remain as a record and feed the client's evidence file.

### F17 — Data Import
- FR17.1 Firm Admins can import existing records using downloadable **Excel and CSV** templates.
- FR17.2 Import validates each row, shows errors before anything is saved, and lets the user fix or skip rows.
- FR17.3 Imported records are marked as imported in the activity log.
- FR17.4 V1 imports all of: clients and contacts, RoPA entries, past DPIAs, existing policies, and evidence files.
- FR17.5 Structured records (clients, contacts, RoPA entries, DPIA register details) import from Excel/CSV rows. Documents (past DPIAs, policies, evidence files) import as a bulk file upload with an Excel/CSV index that links each file to its client and document type or checklist item.
- FR17.6 *Built so far:* CSV import of clients and contacts and of RoPA entries, with row validation and preview. Excel files, past DPIAs, policies and bulk document import are not built yet. Import is not available on the Solo DPO plan (F29).

### F18 — Regulatory Content Management
- FR18.1 The Secretary can add, update, version and retire: regulatory source documents, major-importance criteria, DSAR deadline settings, policy templates, and the CAR checklist template.
- FR18.2 Changes are drafted, then published; firms always see the latest published version.
- FR18.3 Each published change records what changed, when, and by whom.
- FR18.4 Q&A citations and major-importance reasoning reference the version of the source used.
- FR18.5 Published library documents are readable by firm users in a read-only Library page and download as PDF/Word (generated from the library text). Client contacts have no access.

### F21 — Assessments (LIA, TIA, TPRA)
- FR21.1 Three assessment types per client, each with a title and year, optionally linked to a RoPA activity that pre-fills it. Activities that need one are suggested: legitimate interest (LIA), transfers outside Nigeria (TIA), third-party recipients (TPRA).
- FR21.2 **LIA** follows the GAID LIA report format: context, purpose test, necessity test, balancing test (impact likelihood/severity grid), safeguards with owner/date, review; outcome Proceed / Proceed with safeguards / Do not proceed. Exports as the full LIA report.
- FR21.3 **TIA** (NDPA ss.41–43): transfer details, adequacy and evidence (with attachments), s.43 basis, destination risks, supplementary measures, likelihood × impact rating, outcome.
- FR21.4 **TPRA** (NDPA ss.29, 39, 40): processor and service, personal data processed, due diligence (standing, certifications, security, people, sub-processors, transfers, breach history, resilience, exit, evidence with attachments), contractual safeguards (DPA), remediation and review, likelihood × impact rating; outcome Approve / Approve with conditions / Reject or terminate.
- FR21.5 Saving an approved assessment returns it to draft; approval needs an outcome.

### F22 — CAR Audit Report & Remediation Tracker
- FR22.1 From a CAR checklist year, consultants save report details (background, conclusion notes, verification date, maturity override) and generate the data protection compliance audit report in the DPCO format (cover, profile, verification statement, executive summary, risk classifications, scope, assurance summary, findings per part, high-risk findings, conclusion and maturity level).
- FR22.2 A remediation tracker per client and audit year is built from open items and findings (control area, suggested owner, target dates by risk), maintained in the app (owner, target date, status, evidence/comments, date closed; overdue derived), and exported as Excel (dashboard + tracker sheet) and PDF/Word.

### F23 — Data Protection Framework
- FR23.1 Generates the client's Data Protection Framework in the DPCO's framework format: Data Protection Policy, Data Classification, Website Privacy, DPIA, Information Security and Incident Response, Retention and Disposal, Consent (with forms), consequences, review and approval, and appendices (retention laws, breach register, Data Protection Champions, organisational structure).
- FR23.2 Tailored from onboarding (departments, DPO, systems, recipients, transfers, security), the RoPA (lawful bases, retention, high-risk activities), the company profile (overview, vision, mission) and the organogram (embedded image or listed positions). NDPA section references throughout; GAID cited by topic.

### F24 — Capacity Building Plan
- FR24.1 Six trainings per client: Management, DPO Certification, Continuous Professional Development, Data Protection Champion, General Staff, Role-Based. Each can be scheduled any number of times with dates, time, mode, venue, facilitator, audience and planned participants.
- FR24.2 After a session, users record attendance and date held, then attach evidence by type (schedule/agenda, attendance register, pictures, videos, materials, certificates, other).
- FR24.3 The plan exports per year (programme summary, schedule, evidence counts).

### F25 — Billing
- FR25.1 Firm users create invoices per client by ticking services from the DPCO service list and entering fees; optional VAT (7.5%), due date and payment notes. Numbered INV-YYYY-NNN per firm.
- FR25.2 Invoices can be emailed to client contacts (portal notice), marked paid, cancelled or reopened. Marking paid issues a receipt automatically (RCT-YYYY-NNN) and notifies the client.
- FR25.3 A firm-wide billing overview shows outstanding, overdue and paid-this-year totals and filters by status. Clients see their invoices and receipts in the portal.
- FR25.4 Payment happens outside the platform (e.g. bank transfer); the firm records it.

### F26 — Proposals
- FR26.1 Firm users create proposals for prospects (not yet clients): name, address and email required, plus contact, accountable officer, sector, GAID tier, staff and data-subject numbers, departments, brand colours and logo, services and fees, VAT, payment terms, start date, duration and validity. Numbered PRP-YYYY-NNN; status Draft / Sent / Accepted / Declined.
- FR26.2 The proposal follows the DPCO programme format: confidential cover with both logos, letter of transmittal, contents, executive summary, regulatory context (GAID tiers, obligations table, sector regulation, penalties), compliance position, governance architecture, Data Protection Champion network, six-tier training, phased roadmap, deliverables, fees by service with payment terms, value and risk, assumptions/exclusions/terms, acceptance, obligation-to-action matrix and champion appointment brief. Styled in the prospect's colours.
- FR26.3 A cover letter in the DPCO delivery letter format (letterhead with both logos, RE: line, obligations, governance model, financial summary, s.48 exposure, request list).

### F27 — Project Plan
- FR27.1 From the Tasks page, a project plan per client: summary, task table (owner, start, due, days, status) and a timeline by week or month, with approval lines.

### F28 — Report Cover Letters
- FR28.1 Each client report has "Cover letter (PDF/Word)" buttons beside its downloads: firm letterhead, reference, date, addressed to the client's DPO, "RE: Submission of …", what the report is and its legal basis, next steps, signatory.

### F29 — Plans
- FR29.1 Each firm has a plan (§2.4). The Secretary sets it under "Firms and plans". Solo DPO hides and blocks team invitations and spreadsheet import; existing members keep access.

### F30 — Public Blog
- FR30.1 The Secretary writes posts (title, summary, body with tables, numbered steps, bold and links, optional cover image) and publishes them to /blog. Drafts and their covers are never public. Links accept only http(s) or site paths.

### F31 — Single-Firm Install
- FR31.1 Each DPCO gets its own server and domain (`SINGLE_FIRM=1`): no marketing pages; sign-up works once with the install's setup token to create the firm; everyone else joins by invitation. The DPCO's name and logo replace DPO Copilot across the app, portal, emails and authenticator entry.


### F32 — Firm Regulatory Library
- FR32.1 See FR18.5.

### F33 — Audit Readiness Letter
- FR33.1 Marking an invoice paid drafts one Data Protection Audit Readiness Letter for that client (in the DPCO's sample format): letterhead, references, addressee, basis of the exercise, an 11-row readiness requirements table with sector-specific examples, administrative arrangements (priority areas from the client's departments), indicative timeline, signatory and copy line.
- FR33.2 Letters appear under the client's Documents; audit year, commencement date, letter date, the client's reference, addressee, salutation and copy line are editable; PDF/Word download. Not sent automatically.

### F34 — Compliance Audit Notification Letters
- FR34.1 From "Audit notices" (or the Clients dashboard button), the firm picks the audit year, ticks clients (all active by default) and attaches an invoice per client; one letter per client and year (regenerating updates the attached invoice).
- FR34.2 The letter states the annual audit and CAR obligation, the audit period, the 31 March filing deadline and the late-filing penalty, what to prepare, and the enclosed invoice; the invoice follows the letter on the next page in the PDF/Word.
- FR34.3 Sending (one or all) notifies the client's contacts; the letter and invoice then appear in the client's portal. Unsent letters are not visible to clients.

### F35 — Client Incident Register
- FR35.1 Client contacts keep a Data Privacy Incident Register in the portal, in the DPCO's register format: reporting, incident, data and people affected, assessment and containment, notification (NDPA s.40), remediation and closure, with the template's dropdown lists.
- FR35.2 The NDPC deadline is Date Discovered + 72 hours (3 days) when notification is required; days to notify and notification status (within 72h, late, overdue, pending, not required) are calculated.
- FR35.3 A dashboard shows totals, open/closed, critical/high, notification compliance and subjects/records affected, with breakdowns by severity, status and type. The register exports to Excel (Incident Register and Dashboard sheets). Firm users have no access.
---

## 7. Non-Functional Requirements

### 7.1 Security, Privacy & Data Residency
- NFR1 Data encrypted in transit and at rest.
- NFR2 Strict tenant isolation between firms and between clients of the same firm.
- NFR3 Multi-factor authentication (authenticator app, TOTP) available for all users; mandatory for Firm Admins and the Secretary. A development-only bypass exists and is ignored in production.
- NFR4 Role-based access enforced server-side.
- NFR5 **All client data, uploaded files, backups, and AI processing must stay in Nigeria in V1** (founder decision).
- NFR6 Client data is not used to train AI models.
- NFR7 DPO Copilot complies with the NDPA as a data processor for its customers: data processing agreement for firms, privacy notice, and breach procedures for the platform itself.
- NFR8 Uploaded and imported files are scanned for malware (ClamAV) and restricted to allowed types and sizes. In production, uploads are refused if no scanner is configured.
- NFR8a Passwords are stored as salted scrypt hashes; session tokens are stored hashed, in httpOnly, SameSite cookies (Secure in production); sessions last 12 hours (Secretary 2 hours).
- NFR8b Repeated failed sign-ins or MFA codes lock the account key for 15 minutes; the counter is stored in the database.
- NFR8c Every response carries security headers: Content-Security-Policy, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and HSTS in production.
- NFR8d The production Secretary account is created only from install settings (no default password).
- NFR8e Dependencies are kept free of known vulnerabilities (npm audit clean at v1.4).

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
- NFR18a Required form fields are marked with a red asterisk; screen readers announce "required".

### 7.5 Hosting & Data
- NFR19 One install per DPCO on a Kasi Cloud VM in Nigeria: app, PostgreSQL 16, Caddy (automatic HTTPS, request size cap) and ClamAV in Docker. Firms never share a server or database.
- NFR20 The schema creates and updates itself on start; daily database backups kept off-server in Nigeria; encrypted storage and backup retention to be confirmed with Kasi.
- NFR21 Email delivery uses an email provider to be connected at install; until then messages are recorded and logged, not delivered.

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
- Starting a checklist for an audit year creates the full standard template (all 69 Schedule 2 questions); another year's checklist is unaffected.
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
- The deadline is calculated automatically as 30 days from the date received (or the current published setting if changed).
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

**F21–F31 — Built since v1.3**
- Each assessment type can be started pre-filled from a RoPA activity, rated (TIA, TPRA), approved and exported; editing an approved one returns it to draft.
- The audit report and remediation tracker are generated for the chosen audit year; the Excel tracker opens with its dashboard and status dropdown.
- The Data Protection Framework names the client's departments, DPO and RoPA activities, quotes the company profile and includes the organogram.
- A held training session records attendance and accepts pictures and videos as evidence.
- Marking an invoice paid issues a numbered receipt the client can download in the portal; a contact cannot open another client's invoice.
- A proposal requires the client's name, address and email, uses the prospect's colours and both logos, and its totals match the fees entered.
- A Solo DPO firm cannot invite team members or open Import, including by direct link; a DPCO Firm can.
- Unpublished blog posts and their covers are not reachable publicly.

**F32–F35 and v1.5 changes**
- Choosing a department in Section B shows 22 base controls plus the matched unit's own controls; observations save per audit year and appear in the export.
- A task's Professional Fee Payable is visible to its assignee and Admins/Leads, not to other team members or on the project plan.
- Logging a DSAR with an email sends the acknowledgement; assigning a department requires and emails its address; submitting evidence emails the requester with attachments and closes the request.
- Marking an invoice paid creates exactly one readiness letter.
- An unsent audit notification letter cannot be opened by the client; once sent it appears in their portal with the invoice.
- An incident discovered more than 3 days ago with NDPC notification required and no notification date shows Overdue.

---

## 9. Scope

### 9.1 Included in V1
Features F1–F18 (Must-have) for DPCO firms serving multiple clients, with a limited client portal, NDPA 2023 and GAID 2025, English only, all data and AI processing hosted in Nigeria. Built beyond the original scope: F20–F31.

### 9.2 Should-have (V1 if capacity allows, else V1.1)
- F19 Notifications beyond critical alerts (breach alerts are Must-have under F7)

### 9.3 Excluded from V1
- Direct filing of CAR, breach notifications or other returns with the regulator
- GDPR or other non-Nigerian frameworks as full workflows
- In-house (single-organisation) plans
- Client Contact access to AI features
- Online payment (e.g. Paystack) for client invoices or DPO Copilot subscriptions; time tracking
- E-learning delivery (training is scheduled and evidenced in F24, not delivered in-app)
- Full vendor management beyond the third-party risk assessment (F21), e.g. DPA repository and vendor portal
- Integrations with client systems (automated data discovery)
- Native mobile apps
- Languages other than English

### 9.4 Possible Later Additions
- GDPR and other frameworks for clients with international exposure
- In-house compliance plan
- Online payment of invoices and subscriptions (Paystack)
- Choosing a plan at sign-up
- DPA management and vendor portal
- In-app e-learning (possible link with a learning platform)
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
7. Pricing is decided separately; packaging is two plans (Solo DPO, DPCO Firm). Firms pay outside the platform.
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

1. ~~Client signature method~~ **Resolved:** typed name plus a one-time code; signed version fingerprinted (FR14.3).
2. **Nigeria-only AI processing:** If no suitable AI model can run inside Nigeria, is any fallback acceptable (e.g. sending only anonymised or redacted data outside Nigeria), or must AI features wait?
3. ~~CAR checklist items~~ **Resolved:** GAID Schedule 2 audit questionnaire (§6.1).
4. **Pilot cohort:** How many ALDPCON member firms will pilot V1, and when? *(Founder: not decided yet.)*
5. **Online payment:** Add Paystack "pay now" on client invoices (each firm's own account), subscriptions for firms, or both?
6. **Email provider:** Which provider sends invites, reminders and notices from each install?
7. **GAID article references:** Article and schedule numbers used in proposals and the framework come from DPCO source documents and must be verified against the gazetted GAID before client issue.
8. **Plan prices:** Fixed prices for Solo DPO and DPCO Firm (the pricing page shows "On request").
9. **Penetration test:** Who performs the external test before launch, and when?
