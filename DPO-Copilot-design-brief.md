# DPO Copilot — UI/UX Design Brief (V1)

**Status:** Draft v1.0
**Based on:** PRD v1.3, App Flow v1.1, TRD v1.0
**Author role:** Senior Product Designer / Design Systems

---

## 1. Experience Goal

**DPO Copilot should feel like a well-kept compliance register that works for you: calm on an ordinary day, unmistakably clear when a deadline is close, and defensible in every record it shows.**

Three things every screen must communicate at a glance:
1. **What needs me now:** reviews waiting, deadlines approaching, breaches running.
2. **What state a record is in:** draft, in review, approved, signed.
3. **Who did what, and when:** approvals, signatures and AI involvement are always visible.

The audience is professional and busy: DPCO consultants juggling many clients at desks, and client contacts (HR heads, IT managers) acting from their phones, often on 4G. Neither group wants to be impressed. They want to trust what they see and finish the task.

---

## 2. Visual Direction — "Pencil to Ink"

The product's world is registers, case files, signatures and stamps. In Nigerian offices, official approval is still recognised as **blue ink**: the signature, the stamp, the endorsed copy. The visual system is built on one idea taken from that vernacular:

> **Work in progress is pencil. Approved work is ink.**

- **Pencil (graphite):** Drafts, AI drafts and anything not yet approved are rendered in graphite tones with a dashed left rule. They look provisional because they are.
- **Ink (stamp blue):** The primary colour, used for actions and for things that are approved and final. An approved or signed record carries an **approval seal**: a ruled, stamped block showing version, approver and time.
- **Paper:** A cool, slightly grey-green ledger background (not warm cream), with white working surfaces laid on it like sheets on a desk.
- **Documents look like documents:** Policies, DPIAs and notices are set in a serif face on a page-width sheet, so users can tell instantly when they are reading the legal artefact versus operating the interface.

**The one bold element:** the approval seal and the pencil-to-ink transition. Everything else stays quiet: flat surfaces, thin rules, no decoration. Urgency (breaches, deadlines) is the only other place colour gets loud, and only because it must.

**What this rejects:** gradient washes, glass panels, AI "sparkle" purple, grids of identical rounded cards, illustrations of people with laptops, and motion used for atmosphere.

---

## 3. Colour

All values checked against WCAG 2.1 contrast. Ratios are against white (#FFFFFF) unless stated.

### 3.1 Neutrals

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `ink-900` | #1B2433 | Primary text, headings | 15.6:1 (14.4:1 on paper) |
| `ink-700` | #3D4757 | Secondary text, table body | 9.4:1 |
| `ink-500` | #5F6878 | Metadata, help text, placeholders | 5.6:1 (5.2:1 on paper; 4.9:1 on sunken) |
| `border-strong` | #7D8594 | Input, checkbox and select borders (component boundaries) | 3.7:1 |
| `line` | #C9CED6 | Decorative dividers and table rules only | 1.6:1 (decorative only) |
| `paper` | #F5F6F3 | App background | — |
| `surface` | #FFFFFF | Working surfaces: tables, forms, documents | — |
| `surface-sunken` | #EEF0EC | Table headers, read-only fields, locked content | — |

### 3.2 Brand and State

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `stamp-700` | #2A3F9D | Primary buttons, links, focus ring, approved state, approval seal | 9.2:1; white on it 9.2:1 |
| `stamp-800` | #1F2F78 | Primary hover/pressed | white on it 12.1:1 |
| `stamp-50` | #ECEFFA | Selected rows, active nav, info banners | stamp-700 text on it 8.0:1 |
| `graphite-600` | #5B5F66 | Draft and AI-draft labels, pencil text | 6.4:1 |
| `graphite-border` | #7C8088 | Dashed draft rule and AI-draft outline | 4.0:1 |

### 3.3 Semantic Status

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `green-700` | #1E7A4C | Complete, accepted, signed-off confirmation | 5.3:1 |
| `green-50` | #E7F4EC | Success banner/chip background | green-700 on it 4.7:1 |
| `amber-800` | #7A4F00 | Due soon, in progress, warnings (text/icon) | 7.1:1 |
| `amber-600` | #B07800 | Due-soon rule/bar (non-text) | 3.8:1 |
| `amber-50` | #FFF3D6 | Warning banner/chip background | amber-800 on it 6.5:1 |
| `red-700` | #B42318 | Overdue, errors, breach, destructive actions | 6.6:1; white on it 6.6:1 |
| `red-800` | #8F1B12 | Destructive hover/pressed | — |
| `red-50` | #FDECEA | Error banner/chip background | red-700 on it 5.8:1 |

### 3.4 Usage Rules
- **Stamp blue means "act" or "final."** It is never used for decoration, headings or illustration.
- **Green is reserved for completion**, never for "safe to ignore" or general positivity.
- **Red is reserved for overdue, errors, active breaches and destructive actions.** A screen with nothing wrong shows no red.
- **Every status colour is paired with an icon and a text label** (see §7.2). Red and green are never the only difference between two states.
- **No dark mode in V1** (not in PRD). Tokens are named semantically so a dark theme can be added later without redesign.

---

## 4. Typography

### 4.1 Families

| Family | Role | Why |
|---|---|---|
| **Atkinson Hyperlegible Next** (OFL) | All interface text: navigation, forms, tables, buttons, labels | Designed for legibility, with clearly distinct characters (0/O, 1/l/I). This matters for reference numbers, OTP codes, email addresses and dates read on small phone screens |
| **Source Serif 4** (OFL) | Document bodies only: policies, DPIAs, notices, DSAR responses, the signing view, Q&A answer text | Marks "this is the legal artefact" versus "this is the tool"; comfortable for long reading |

- **Self-host both fonts** from the app itself. Loading from a font CDN outside Nigeria sends user IP addresses abroad (conflicts with NFR5).
- Subset to Latin + Latin Extended (for Nigerian names with diacritics such as Ọ, Ẹ, Ṣ, ń), WOFF2 only; load 400 and 700 upfront, 600 on demand.
- **Tabular figures are required** for countdowns, deadlines, scores and table numbers (`font-variant-numeric: tabular-nums`). **Verify Atkinson Hyperlegible Next supports tabular figures before sign-off**; if not, use Source Serif 4's lining figures for countdown digits only (see DFLAG-9).
- Fallback stacks: `"Atkinson Hyperlegible Next", "Segoe UI", Roboto, Arial, sans-serif` and `"Source Serif 4", Georgia, "Times New Roman", serif`.

### 4.2 Scale (1.2 ratio, rounded to whole pixels, rem-based)

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `display` | 36 / 44 | 700 | Breach countdown figure only |
| `h1` | 28 / 36 | 700 | Page title (one per page) |
| `h2` | 22 / 30 | 700 | Section heading |
| `h3` | 18 / 26 | 600 | Panel and group heading |
| `body-lg` | 18 / 28 | 400 | Portal body on mobile; key instructions |
| `body` | 16 / 24 | 400 | Default interface text |
| `body-strong` | 16 / 24 | 600 | Emphasis, table first column |
| `small` | 14 / 20 | 400 | Table cells on desktop, help text, metadata |
| `caption` | 13 / 18 | 400 | Timestamps and seal details only; never for instructions |
| `doc-body` | 17 / 28 (serif) | 400 | Document text, 66–72 characters per line |
| `doc-h1` / `doc-h2` | 26 / 34 · 20 / 28 (serif) | 600 | Document headings |

### 4.3 Rules
- Sentence case everywhere: headings, buttons, labels, navigation. **No all-caps labels.**
- Minimum 16px for anything a Client Contact must read or type on mobile; 14px is the floor for dense desktop tables.
- Line length ≤ 80 characters for interface prose; 66–72 for document bodies.
- Weight, not colour, creates hierarchy in headings. Headings are always `ink-900`.

---

## 5. Spacing, Grid, Containers, Responsiveness

### 5.1 Spacing Scale (4px base)
`space-1` 4 · `space-2` 8 · `space-3` 12 · `space-4` 16 · `space-5` 24 · `space-6` 32 · `space-7` 48 · `space-8` 64

- Inside components: 8–16. Between related groups: 24. Between page sections: 32–48.
- Table row height: 48 (desktop), rows stack on mobile.

### 5.2 Breakpoints
| Name | Width | Layout |
|---|---|---|
| `xs` | 320–639 | Single column; all tables become stacked rows |
| `sm` | 640–1023 | Single column with wider margins; firm sidebar collapses to a menu |
| `md` | 1024–1279 | Firm sidebar visible at full 240px width; right rail content moves below the main column |
| `lg` | ≥ 1280 | Full layout with right rail on record screens |

**Minimum supported width: 320 CSS px** (WCAG 1.4.10 reflow). See DFLAG-1.

### 5.3 Layout Structures
- **Firm workspace:** Left sidebar 240px (global nav) + content. Client screens add a **client header** and a **grouped client navigation** (see §6.3). Content max-width 1280px; record screens use a 12-column grid, 24px gutters: main 8 columns + right rail 4 columns (review, AI panel, versions, activity).
- **Document screens:** Sheet width fixed to 72 characters of `doc-body` (~720px), centred in the main column, on `surface` against `paper`.
- **Client portal:** Single column, max-width 640px, 16px side margins at `xs`, 24px at `sm+`. No sidebar.
- **Secretary console:** Same shell as firm workspace, different nav set, and a persistent "Secretary console" label in the header so staff never confuse it with a firm workspace.
- **Alignment:** Left-aligned text everywhere. Numbers right-aligned in tables. Nothing centred except empty-state blocks and the sign-in form.

### 5.4 Surfaces and Depth
- Surfaces are separated by 1px `line` rules, not shadows.
- **Shadows only for things that float:** menus, drawers, dialogs, toasts (`0 8px 24px rgba(27,36,51,0.16)`).
- **Radius by role, not one radius for everything:** inputs, buttons, chips 4px; panels and dialogs 8px; table rows and document sheets 0; the approval seal 2px (a stamp has crisp edges).

---

## 6. Components

### 6.1 Buttons

| Variant | Look | Use |
|---|---|---|
| **Primary** | `stamp-700` fill, white text, 4px radius | The one main action per view region ("Approve", "Send for review", "Submit report") |
| **Secondary** | White fill, `border-strong` 1px, `ink-900` text | Supporting actions ("Save draft", "Export") |
| **Quiet** | No border, `stamp-700` text, underline on hover | Low-emphasis actions in tables and rails |
| **Destructive** | `red-700` fill, white text | Deactivate, archive, revoke — always behind a confirmation dialog |
| **Emergency** | `red-700` outline 2px, red text, alert icon, full width on mobile | Portal "Report a breach" only |

- Heights: 40px desktop; **48px** on the client portal and on all mobile layouts. Minimum width 88px.
- Labels are verbs naming the result: "Approve DPIA", "Send code", "Record as sent" — never "Submit" or "OK". No trailing arrows.
- Loading: label stays, spinner appears left of it, button disabled, width unchanged.
- One primary button per region. Destructive and primary never sit side by side.

### 6.2 Inputs and Forms
- Label above field (`body-strong`), help text below label (`small`, `ink-500`), error below field (`small`, `red-700` + error icon).
- Field height 40 desktop / 48 mobile; `border-strong` border; focus = 2px `stamp-700` ring.
- Required fields marked "(required)" in text; optional fields are the default.
- Date/time inputs always show "WAT". Awareness time and date received use explicit date + time pickers with manual entry allowed.
- **OTP field:** single input, `inputmode="numeric"`, `autocomplete="one-time-code"`, digits spaced by letter-spacing (not six separate boxes, which break paste and screen readers).
- File upload: drop zone on desktop, "Choose file or take photo" on mobile; per-file row shows progress → "Checking for viruses" → "Ready" or rejection reason.
- Autosave (questionnaire): status text "Saved 14:02" next to section heading; "Not saved — retry" in red on failure.

### 6.3 Navigation
- **Global sidebar (firm):** Clients, Tasks, Calendar, Ask, Import (Firm Admin), Settings (Firm Admin). Active item: `stamp-50` fill + 3px `stamp-700` left rule + bold label.
- **Client header:** Client name (h1), status chip, major-importance classification, readiness %, archived banner when relevant.
- **Grouped client navigation** (left column inside client pages at `lg`, a "Sections" select at `xs–sm`):
  - Overview
  - **Set up:** Onboarding, Data inventory, RoPA
  - **Assess:** DPIAs, Gaps, CAR readiness
  - **Documents and evidence:** Documents, Evidence
  - **Respond:** Breaches, DSARs
  - Settings
  Group names are sentence-case headings, not caps labels. Badges show counts that need action (overdue, active breach).
- **Breadcrumbs** on record screens: Clients / Client name / Section / Record.
- **Portal:** Top bar with client name and account menu. Home is the hub; every portal page has "Back to home".

### 6.4 Registers (tables) instead of card grids
Lists of records (clients, RoPA, DPIAs, evidence, DSARs, tasks, activity) are **registers**: full-width tables on `surface`, 1px rules, sticky header on `surface-sunken`, first column bold and linked. Status and deadline columns use chips. At `xs` each row becomes a stacked block: title, status chip, deadline, then secondary fields.

Cards are used only where items are genuinely different objects needing different actions (review queue items, portal to-do items), and even then they are **rows with a left status rule**, not floating rounded tiles.

### 6.5 Status Chips
- Shape: 4px radius, 24px high, icon + text, tinted background.
- Draft (graphite, pencil icon) · AI draft (graphite, dashed outline, "AI draft") · In review (stamp-50, clock icon) · Approved (stamp-700 outline, seal icon) · Client signed off (stamp-700 fill, white text, signature icon) · Complete (green) · In progress (amber) · Missing (red outline) · Not applicable (grey, strike icon) · Overdue (red fill, white text).

### 6.6 Deadline Strip
Used on breaches, DSARs, evidence requests and review items.
- Normal: `ink-700` text "Due 14 Oct, 16:00 WAT (5 days)".
- Due soon: amber left rule + amber-50 background + "Due soon" label.
- Overdue: red left rule + red-50 background + "Overdue by 6 hours".
- **Breach countdown** (F16, F01 pinned strip): `display` size tabular figures "31h 12m left" with "Notify NDPC by 14 Oct, 09:30 WAT" beneath. Updates once per minute.

### 6.7 Approval Seal (signature element)
A ruled block (2px `stamp-700` border, 2px radius, `surface` fill) placed at the top of any approved or signed record and on exports:
- Line 1: seal icon + "Approved" (or "Signed by client").
- Line 2: "Version 3, approved by Adaeze Okafor"
- Line 3: "12 October 2026, 14:05 WAT"
- Signed version adds: signer name, OTP channel, and a short document fingerprint with "View full record".
The seal is the only element in the product that uses a double rule, so it is instantly recognisable.

### 6.8 Pencil Treatment (drafts and AI)
- Draft records: dashed 2px `graphite-border` left rule on the document sheet; "Draft" chip in the header.
- AI-generated blocks inside a draft: dashed 1px outline, "AI draft" label at top-left of the block with actions **Accept**, **Edit**, **Discard**. Accepted text keeps a thin dashed left rule until the whole record is approved, so reviewers can see which passages came from AI.
- No sparkle icons, gradients or purple for AI. The AI icon is a simple pencil-with-dot mark in graphite.

### 6.9 Feedback Components
| Component | Use | Behaviour |
|---|---|---|
| **Toast** | Confirmation of a completed action ("DPIA approved") | Bottom-left desktop, bottom on mobile above sticky action bar; 5s; pauses on hover/focus; dismissible; never used for errors that need action |
| **Inline banner** | Page-level context: archived, deadline passed, criteria updated, AI unavailable | Full width at top of content; icon + text + optional action |
| **Field error** | Validation | Under field; summary list at top of long forms linking to each error |
| **Job row** | AI drafts, imports, exports, ingestion | Shows Queued / In progress / Done / Failed with Retry; also appears in notifications when done |
| **Skeleton** | Loading | Grey bars matching final layout; no shimmer animation |
| **Empty state** | No data | One sentence saying what goes here + primary action; no illustration |
| **Confirmation dialog** | Destructive or irreversible actions | Title states the action ("Archive Ikeja Clinic?"); body states the effect; buttons "Archive client" / "Cancel" |
| **Critical alert (breach)** | Client-reported breach | Red banner pinned at top of F01 and in notifications until opened |

---

## 7. Interaction States

### 7.1 Required States for Every Interactive Element
| State | Treatment |
|---|---|
| Default | As specified per component |
| Hover (pointer only) | Darken fill one step or add underline; never the only indicator of interactivity |
| Focus-visible | 2px `stamp-700` outline, 2px offset, on every focusable element; never removed |
| Active/pressed | `stamp-800` / `red-800` fill |
| Disabled | 50% opacity on fill, **plus a visible reason in text** nearby (see DFLAG-5) |
| Loading | Spinner + disabled, label retained |
| Selected | `stamp-50` background + check icon or left rule |
| Error | `red-700` border + message |
| Read-only | `surface-sunken` background, no border, lock icon where the reason matters |
| Locked (approved/signed) | Approval seal + "Edit creates a new version" quiet action |
| Archived | Page banner + all edit controls removed |

### 7.2 Record Status Language (consistent everywhere)
Draft → In review → Approved → Awaiting client sign-off → Client signed off. Evidence: Open → Submitted → Accepted / Rejected. Checklist: Complete / In progress / Missing / Not applicable. Each status has one fixed chip (§6.5). The same word is used in the button, the chip, the toast and the activity log: "Approve" → "Approved".

---

## 8. Screen Composition Guidance

Screen IDs match App Flow v1.1.

| Screen | Composition |
|---|---|
| **S01–S07 Auth** | Centred single column (max 400px) on `paper`, product name in text (no hero image). Firm or client name shown on invitation screens so people know who invited them. |
| **F01 Dashboard** | Top to bottom: (1) pinned active-breach strip (only if any), (2) **Waiting for my review** register (FA/LC) sorted by urgency with deadline strips, (3) client register with columns: client, status, open gaps, overdue, breaches, DSARs, readiness. Readiness shown as number + thin bar. No KPI tiles. |
| **F02 Add client** | Single form column (max 640px), assigned team picker, "Create client" primary. |
| **F03 Client overview** | Client header; "Next step" block (one sentence + one primary action); then a two-column register of open items by section (gaps, overdue tasks, evidence outstanding, awaiting approval/sign-off). Items link to their screens. |
| **F04 Client settings** | Three stacked sections: Details, Client contacts (register with invite status), Assigned team. Archive in a separated "Danger" section at the bottom. |
| **F05 / P02 Questionnaire** | Section list on left (desktop) or top progress text "Section 3 of 9" (mobile); one section per view; autosave status by heading; sticky "Save and continue" on mobile. Sections are a real sequence, so numbering is used. |
| **F06 Data inventory** | Grouped registers (data subjects, data categories with sensitive flag icon, systems, recipients, transfers). Major-importance indicator as a bordered panel: result, reasoning as a short list, cited guidance version, then classification control (LC/FA). |
| **F07 RoPA** | Register with "Proposed" and "Active" tabs; missing-field warning chip per row. |
| **F08 RoPA entry** | Form in main column; right rail shows linked DPIAs and change history. |
| **F10–F11 DPIA** | Numbered stepper (7 steps, a true sequence) left; step content centre; right rail: review bar, AI panel, versions. Risk scoring as a labelled 5×5 grid where each cell shows the score number and level text (see DFLAG-2). |
| **F12–F13 Documents** | Register of documents; editor shows the serif document sheet centred, formatting toolbar above, right rail with NDPA mapping, AI panel, review bar, versions. Approval seal sits at the top of the sheet once approved. |
| **F14–F16 Breaches** | Detail page leads with the breach countdown (display size) and "Notify NDPC by" time; then incident facts; then notification drafts (two sheets: regulator, data subjects) each with its own status; then "Record as sent" block. |
| **F17–F19 DSARs** | Detail leads with deadline strip + request type + identity verification status; response drafted in a serif sheet below. |
| **F20–F21 Evidence** | Register grouped by checklist category; detail shows files list with scan status and a decision block (Accept / Reject with required comment). |
| **F22 CAR readiness** | Overall score at top (number + bar, "18 of 24 items complete"). Five category sections, each an expandable group showing its own score and items as rows with status chip, linked evidence, and actions. Auto-link suggestions appear inline as a row labelled "Suggested evidence" with Confirm and Dismiss actions. |
| **F23 Gaps** | "Run gap check" primary; last run time; register sorted by severity with severity chip, rule, linked record and suggested next action. |
| **F24 Tasks** | Register with filters above; "New task" primary. |
| **F25 Calendar** | List view by default on all widths below `lg`; month grid available on desktop. Each item shows type icon + label, never colour alone. |
| **F26 Ask** | Question field at top; answers in serif with numbered citations; citations listed below as source, section, version. "Guidance, not legal advice" notice under every answer. |
| **F27 Import** | Numbered stepper (true sequence); validation preview as a register with error rows first and each error in plain language. |
| **F28–F30 Settings** | Registers with row actions; activity log has filters and no edit controls. |
| **C01 Notifications** | Right-side drawer (desktop), full-screen sheet (mobile); breach alerts pinned first in red. |
| **P01 Portal home** | Firm and client name; one-line status ("Your compliance file is 72% ready"); "To do" list as rows with deadline strips; then **Report a breach** (emergency button) and **Log a data subject request** (secondary). |
| **P03 Evidence** | Rows with status; detail shows the request, rejection comment (if any) in an amber banner, upload control with camera option. |
| **P04–P05 Documents & signing** | Awaiting sign-off first. Signing view: serif document, full width, then a sticky footer "Sign this document" that opens: typed name → "Send code" → OTP field → "Sign document". Success shows the approval seal with the client signature. |
| **P06 Report a breach** | Short form (5 fields), plain questions ("When did you find out?"), sticky submit; confirmation shows reference and "Your DPCO has been alerted". |
| **P07 Log a request** | Short form, request type as radio list with one-line explanations. |
| **R01–R08 Secretary** | Registers with Draft/Published chips; "Publish" screen lists pending changes with who/what/where; publish confirmation states "This goes live for all firms immediately." |

---

## 9. Mobile-Specific Behaviour

- **Client portal is mobile-first**; firm workspace is desktop-first but must work on phones for urgent tasks (breach, review approval).
- Touch targets **≥ 44×44px** everywhere on mobile; 48px buttons and fields in the portal.
- **Sticky action bar** at the bottom for the main action on long forms and signing (with safe-area padding for phone home indicators).
- Tables become stacked rows at `xs`; no horizontal scrolling for primary content. Wide content that cannot stack (risk grid, activity log) scrolls inside its own container with a visible scroll hint.
- Firm sidebar becomes a top-left menu button opening a full-height sheet; client navigation becomes a "Sections" select.
- Right rail content (review bar, AI panel, versions) moves below the main content; the review bar becomes the sticky footer.
- Keyboard types: `numeric` for OTP and counts, `email` for emails, `tel` for phone.
- Camera capture offered for evidence uploads.
- **Low bandwidth:** no images or illustrations in the UI; two font families only; subsetted fonts; skeletons instead of spinners for page loads; forms keep entered text when the network drops.

---

## 10. Motion

**Principle: motion only answers a user's action and shows what changed. The single orchestrated moment is the seal.**

| Motion | Duration / easing | Reduced-motion version |
|---|---|---|
| Dialog open/close | 160ms, fade + scale 0.98→1, ease-out | Fade only, 100ms |
| Drawer / mobile sheet | 200ms slide, ease-out | Instant, no slide |
| Accordion (checklist categories) | 160ms height, ease-out | Instant |
| Toast enter/leave | 160ms fade + 8px rise | Fade only |
| **Approval seal applied** | 220ms: seal fades in at 104% scale and settles to 100% (a stamp press) | Instant appearance |
| Status chip change | 120ms colour cross-fade | Instant |

Never:
- Animate countdown digits, pulse or flash breach alerts (WCAG 2.3.1; also distressing during an incident).
- Animate page entrances, scroll reveals, hover lifts on rows, or skeleton shimmer.
- Autoplay anything.

Reduced motion is honoured via `prefers-reduced-motion: reduce`; no in-app override is needed in V1.

---

## 11. Accessibility Requirements (WCAG 2.1 AA minimum)

- **Contrast:** Text ≥ 4.5:1, large text and UI boundaries ≥ 3:1. All tokens in §3 meet this; `line` is decorative only.
- **Not colour alone:** Every status, deadline state, severity and risk level uses icon + text.
- **Keyboard:** Every action reachable and operable by keyboard, including the risk grid, calendar, file upload, editor toolbar, drawers and dialogs. Logical tab order; skip link to main content; focus returns to the trigger when a dialog closes.
- **Focus visible:** 2px stamp-blue outline with offset on every element; never removed.
- **Screen readers:** Landmarks (header, nav, main); one h1 per page; form fields with programmatic labels; errors linked via `aria-describedby`; status changes announced via polite live regions ("DPIA approved"). The breach countdown is **not** a live region; only threshold changes ("Due in less than 24 hours", "Overdue") are announced.
- **Reflow and zoom:** Usable at 320 CSS px and at 200% text zoom without loss of content.
- **Target size:** ≥ 44px on touch layouts; ≥ 24px with spacing on desktop.
- **Time limits:** Warn before session timeout with an option to continue; OTP expiry shows remaining time and "Send a new code" (see DFLAG-4).
- **Language:** `lang="en-NG"`; plain language in all instructions; avoid legal jargon in the portal ("personal data" not "PII").
- **Editor:** TipTap toolbar buttons have accessible names and keyboard shortcuts; headings in documents use real heading levels.
- **Exports:** Generate tagged PDFs with headings and reading order (see DFLAG-8).
- **Testing:** axe-core in automated tests; manual keyboard pass and NVDA + VoiceOver (iOS) pass on core flows before launch.

---

## 12. Always-Use / Never-Use Rules

### Always
- Pencil for drafts, ink for final: graphite dashed rule for drafts and AI content; stamp blue and the seal for approved/signed.
- Show who, what and when on every approved, signed or AI-generated item.
- Pair every status colour with an icon and a text label.
- Show deadlines with date, time and "WAT", plus the relative time remaining.
- Use registers (tables with rules) for lists of records.
- Name buttons by their result and reuse that word in the toast and log.
- Explain why something is disabled, in visible text.
- Keep entered data when an error occurs.
- Use the serif face only for legal/document content.
- Self-host fonts and assets.

### Never
- Gradients, glassmorphism, blurred backgrounds or decorative shadows on static surfaces.
- Grids of identical rounded cards for records, or KPI tile rows on dashboards.
- Purple, sparkles or "magic" icons for AI.
- All-caps labels, eyebrow labels above headings, or arrows appended to button text.
- Red or green as decoration, or colour as the only signal.
- Flashing, pulsing or animated countdowns.
- Illustrations, stock photos or mascots in the product UI.
- Tooltips as the only place important information lives (they don't work on touch).
- Loading fonts, icons or scripts from servers outside Nigeria.
- Showing internal notes, AI panels or unshared drafts anywhere in the client portal.

---

## 13. Design Flags — Conflicts With Journeys or Accessibility

| Flag | Source | Conflict | Resolution in this brief / decision needed |
|---|---|---|---|
| **DFLAG-1** | App Flow P01/NFR16 ("usable at 360px") | WCAG 1.4.10 requires reflow at **320 CSS px**. | Design to 320px minimum. Update App Flow wording. |
| **DFLAG-2** | PRD FR5.2 risk scoring (likelihood × impact) | A coloured heat-map grid would communicate risk by colour alone and is hard to operate by keyboard. | Grid cells show number + level text, are keyboard-selectable radio options, and the chosen result is repeated in text. |
| **DFLAG-3** | PRD FR7.3 "live countdown" | A per-second ticking countdown distracts, is noisy for screen readers, and can raise stress during an incident. | Update once per minute; not a live region; announce threshold changes only. Confirm minute-level precision is acceptable. |
| **DFLAG-4** | TRD OTP 10-minute expiry, session timeouts | WCAG 2.2.1 requires users to be warned and able to extend time limits. A client reading a long policy may run out of time. | Code is only requested **after** reading (at the sign step); show time remaining and "Send a new code"; warn before session timeout with "Stay signed in". |
| **DFLAG-5** | App Flow (e.g. "Mark complete disabled", "Create disabled") | Disabled controls with no visible reason fail users who can't discover why (and tooltips fail on touch). | Every disabled primary action shows a one-line reason next to it. |
| **DFLAG-6** | App Flow client sub-navigation (12 flat items) | 12 tabs overflow on tablets and phones and slow scanning. | Presentation-only grouping (§6.3); no screens or routes change. Confirm grouping names. |
| **DFLAG-7** | App Flow F25 calendar | Month grids are hard to use on phones and with screen readers. | List view is the default below `lg`; month grid is optional on desktop. |
| **DFLAG-8** | PRD F15 exports | PRD doesn't require accessible exports, but signed PDFs go to clients and regulators. | Recommend tagged PDFs; confirm as a requirement (TRD export approach must support it). |
| **DFLAG-9** | Typography choice | Tabular figures in Atkinson Hyperlegible Next are unverified; countdowns and tables need them to avoid jumping digits. | Verify before sign-off; fallback defined in §4.1. |
| **DFLAG-10** | TRD NFR5 (data residency) vs common font/icon CDNs | Google Fonts or icon CDNs would send user IPs outside Nigeria. | Self-host fonts and icons (e.g. Lucide icons bundled into the app). |
| **DFLAG-11** | Open App Flow flags (FLAG-3, FLAG-4, FLAG-6) | Rejection paths and post-submission visibility are undefined, so the review bar and portal signing view have no "send back" or status-tracking design yet. | Designs leave space for a secondary "Send back with comment" action; finalise once decided. |
| **DFLAG-12** | PRD NFR17 (WCAG 2.1 AA) | This brief applies some WCAG 2.2 AA criteria (target size, focus not obscured by sticky bars). | Recommend adopting WCAG 2.2 AA as the target; confirm. |
