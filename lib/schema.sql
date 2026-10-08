-- DPO Copilot V1 schema. Trimmed from DPO-Copilot-backend-schema.md.
-- ponytail: tenancy enforced in app layer (lib/auth.ts can*/require*); add RLS policies as the second layer before production (TRD §4).

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  platform_role text not null default 'none' check (platform_role in ('none','secretary')),
  status text not null default 'active' check (status in ('active','deactivated')),
  mfa_secret text, -- ponytail: stored plain in the DB; encrypt at app level (schema §2) before production
  mfa_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token_hash text primary key,
  user_id uuid not null references users on delete cascade,
  mfa_ok boolean not null default true, -- false until the second factor is passed
  expires_at timestamptz not null
);

create table if not exists firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references users,
  created_at timestamptz not null default now()
);

-- Firm (DPCO) profile, used on audit reports (lib/car-report.ts).
alter table firms add column if not exists address text;
alter table firms add column if not exists website text;
alter table firms add column if not exists email text;
alter table firms add column if not exists phone text;
alter table firms add column if not exists ndpc_licence_no text;
alter table firms add column if not exists signatory_name text;
alter table firms add column if not exists signatory_credentials text;
alter table firms add column if not exists signatory_title text;

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  user_id uuid not null unique references users,
  role text not null check (role in ('firm_admin','lead_consultant','associate')),
  status text not null default 'active' check (status in ('active','deactivated')),
  created_at timestamptz not null default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  name text not null,
  sector text,
  size text,
  status text not null default 'onboarding' check (status in ('onboarding','active')),
  mi_class text check (mi_class in ('major_importance','not_major_importance')),
  classified_by uuid references users,
  classified_at timestamptz,
  car_filing_due_on date,
  gaps_checked_at timestamptz,
  archived_at timestamptz,
  created_by uuid not null references users,
  created_at timestamptz not null default now()
);

create table if not exists client_assignments (
  client_id uuid not null references clients on delete cascade,
  membership_id uuid not null references memberships on delete cascade,
  primary key (client_id, membership_id)
);

create table if not exists client_contacts (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid not null references clients,
  user_id uuid unique references users,
  name text not null,
  email text not null,
  phone text,
  status text not null default 'invited' check (status in ('invited','active','invite_revoked')),
  created_at timestamptz not null default now(),
  unique (client_id, email)
);

create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid references clients,
  contact_id uuid references client_contacts,
  email text not null,
  role text not null check (role in ('firm_admin','lead_consultant','associate','client_contact')),
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_by uuid not null references users,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check ((role = 'client_contact') = (client_id is not null))
);

-- Onboarding & data mapping
create table if not exists questionnaires (
  client_id uuid primary key references clients,
  firm_id uuid not null references firms,
  status text not null default 'not_sent' check (status in ('not_sent','sent','in_progress','completed')),
  assigned_contact_id uuid references client_contacts,
  sent_at timestamptz,
  completed_at timestamptz
);

create table if not exists answers (
  client_id uuid not null references clients,
  question_key text not null,
  answer jsonb not null,
  updated_by uuid not null references users,
  updated_at timestamptz not null default now(),
  primary key (client_id, question_key)
);

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid not null references clients,
  item_type text not null check (item_type in ('data_subject','data_category','system','purpose','recipient','transfer')),
  name text not null,
  is_sensitive boolean not null default false,
  source text not null default 'questionnaire' check (source in ('questionnaire','manual','import')),
  archived_at timestamptz
);

create table if not exists mi_assessments (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid not null references clients,
  result text not null check (result in ('likely','unlikely')),
  reasoning jsonb not null,
  criteria_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists ropa_entries (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid not null references clients,
  state text not null default 'proposed' check (state in ('proposed','active','archived')),
  purpose text not null,
  lawful_basis text check (lawful_basis in ('consent','contract','legal_obligation','vital_interest','public_interest','legitimate_interest')),
  data_subjects text,
  data_categories text,
  involves_sensitive boolean not null default false,
  recipients text,
  has_transfer boolean not null default false,
  transfer_safeguard text,
  retention_period text,
  security_measures text,
  system_owner text,
  is_high_risk boolean not null default false,
  source text not null default 'manual' check (source in ('questionnaire','manual','import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Department that owns the activity, from the client's onboarding list (org_departments).
alter table ropa_entries add column if not exists department text;

-- Approvable content: DPIAs, documents, breach notifications, DSAR responses share content_versions.
create table if not exists dpias (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid not null references clients,
  title text not null,
  review_date date,
  created_by uuid not null references users,
  created_at timestamptz not null default now()
);

-- DPIA assessment year (expand + backfill from the creation date in WAT; idempotent).
alter table dpias add column if not exists assessment_year int check (assessment_year between 2019 and 2100);
update dpias set assessment_year = extract(year from created_at at time zone 'Africa/Lagos')::int where assessment_year is null;
alter table dpias alter column assessment_year set not null;

create table if not exists dpia_ropa (
  dpia_id uuid not null references dpias on delete cascade,
  ropa_entry_id uuid not null references ropa_entries,
  primary key (dpia_id, ropa_entry_id)
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid not null references clients,
  template_key text check (template_key in ('privacy_notice','data_retention_policy','consent_form')),
  title text not null,
  ndpa_refs text,
  reference_tags text,
  created_by uuid not null references users,
  created_at timestamptz not null default now()
);

create table if not exists breaches (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid not null references clients,
  reported_via text not null check (reported_via in ('firm','portal')),
  reported_by uuid not null references users,
  reporter_phone text,
  aware_at timestamptz not null,
  deadline_at timestamptz not null,
  description text not null,
  data_affected text,
  subjects_affected text,
  est_count int check (est_count >= 0),
  containment text,
  remediation text,
  severity text check (severity in ('low','medium','high')),
  notification_required text not null default 'unknown' check (notification_required in ('yes','no','unknown')),
  not_required_reason text,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  check (aware_at <= created_at + interval '1 minute'),
  check (notification_required <> 'no' or not_required_reason is not null)
);

create table if not exists breach_notifications (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid not null references clients,
  breach_id uuid not null references breaches,
  audience text not null check (audience in ('regulator','data_subjects')),
  sent_at timestamptz,
  sent_method text,
  sent_to text,
  recorded_by uuid references users,
  unique (breach_id, audience)
);

create table if not exists dsars (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid not null references clients,
  source text not null check (source in ('firm','portal')),
  logged_by uuid not null references users,
  request_type text not null check (request_type in ('access','rectification','erasure','objection','portability')),
  received_on date not null,
  period_days int not null,
  deadline_on date not null,
  requester_name text not null,
  requester_contact text,
  details text,
  id_status text not null default 'not_verified' check (id_status in ('not_verified','verified','failed')),
  status text not null default 'open' check (status in ('open','closed')),
  response_sent_at timestamptz,
  response_sent_method text,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists dsar_ropa (
  dsar_id uuid not null references dsars on delete cascade,
  ropa_entry_id uuid not null references ropa_entries,
  primary key (dsar_id, ropa_entry_id)
);

create table if not exists content_versions (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid not null references clients,
  parent_type text not null check (parent_type in ('dpia','document','breach_notification','dsar')),
  parent_id uuid not null,
  version_no int not null check (version_no >= 1),
  status text not null default 'draft' check (status in ('draft','in_review','approved','awaiting_client_signoff','client_signed_off')),
  body text not null default '',
  ai_generated boolean not null default false,
  ai_proposal text, -- pending AI draft awaiting Accept / Discard (C02)
  submitted_by uuid references users,
  submitted_at timestamptz,
  approved_by uuid references users,
  approved_at timestamptz,
  created_by uuid not null references users,
  created_at timestamptz not null default now(),
  unique (parent_type, parent_id, version_no),
  check (status in ('draft','in_review') or approved_by is not null)
);

-- FR5.3 / FR14.4: once a version leaves draft its body is frozen; edits create a new version.
create or replace function freeze_content() returns trigger language plpgsql as $$
begin
  if old.status <> 'draft' and new.body is distinct from old.body then
    raise exception 'content version % is locked', old.id;
  end if;
  return new;
end $$;
drop trigger if exists content_versions_freeze on content_versions;
create trigger content_versions_freeze before update on content_versions for each row execute function freeze_content();

create table if not exists signoff_requests (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid not null references clients,
  version_id uuid not null references content_versions,
  status text not null default 'pending' check (status in ('pending','signed','cancelled')),
  requested_by uuid not null references users,
  created_at timestamptz not null default now()
);

create table if not exists otp_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users,
  request_id uuid not null references signoff_requests,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0 check (attempts <= 5),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists signatures (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid not null references clients,
  request_id uuid not null references signoff_requests,
  version_id uuid not null references content_versions,
  contact_id uuid not null references client_contacts,
  user_id uuid not null references users,
  typed_name text not null,
  content_sha256 text not null,
  otp_channel text not null check (otp_channel in ('email','sms')),
  signed_at timestamptz not null default now(),
  ip text,
  user_agent text
);

-- Evidence & CAR readiness
create table if not exists car_template_items (
  id uuid primary key default gen_random_uuid(),
  category_key text not null check (category_key in ('governance','technology','accountability_risk','cross_border_transfer','data_processors')),
  text text not null,
  position int not null,
  auto_link_rule text check (auto_link_rule in ('approved_policies','dpias','ropa_lawful_basis','ropa_transfers','ropa_recipients','ropa_current')),
  status text not null default 'draft' check (status in ('draft','published','retired')),
  retire_pending boolean not null default false
);

-- Schedule 2 template (lib/car-template.ts): a sixth part, question priority and Part 4 sub-sections.
alter table car_template_items drop constraint if exists car_template_items_category_key_check;
alter table car_template_items add constraint car_template_items_category_key_check
  check (category_key in ('governance','principles','technology','accountability_risk','cross_border_transfer','data_processors'));
alter table car_template_items add column if not exists priority text check (priority in ('high','medium','low'));
alter table car_template_items add column if not exists section text;

create table if not exists client_car_items (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid not null references clients,
  template_item_id uuid not null references car_template_items,
  category_key text not null,
  item_text text not null,
  position int not null,
  auto_link_rule text,
  status text not null default 'missing' check (status in ('complete','in_progress','missing','not_applicable')),
  na_reason text,
  is_new boolean not null default false,
  link_state text check (link_state in ('confirmed','dismissed')),
  updated_by uuid references users,
  check (status <> 'not_applicable' or na_reason is not null)
);

-- CAR readiness extras: the audit year being prepared (per client) and the consultant's recommendation per item.
alter table clients add column if not exists car_audit_year int check (car_audit_year between 2019 and 2100);
alter table client_car_items add column if not exists recommendation text;
-- Copied from the template item, plus the consultant's answer ("Yes / No / Facts") and evidence noted for the item.
alter table client_car_items add column if not exists priority text check (priority in ('high','medium','low'));
alter table client_car_items add column if not exists section text;
alter table client_car_items add column if not exists answer text;
alter table client_car_items add column if not exists evidence_notes text;

-- One CAR checklist per client per audit year (expand + backfill; idempotent, runs on every start).
-- clients.car_audit_year is the ACTIVE year: dashboard, portal, gaps and evidence read that year's checklist.
-- Rollback while each client still has a single year: restore unique (client_id, template_item_id) and ignore audit_year.
update clients set car_audit_year = extract(year from now())::int - 1 where car_audit_year is null;
alter table client_car_items add column if not exists audit_year int;
update client_car_items i set audit_year = c.car_audit_year from clients c where c.id = i.client_id and i.audit_year is null;
alter table client_car_items alter column audit_year set not null;
alter table client_car_items drop constraint if exists client_car_items_client_id_template_item_id_key;
create unique index if not exists client_car_items_year on client_car_items (client_id, audit_year, template_item_id);

create table if not exists evidence_requests (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid not null references clients,
  title text not null,
  description text,
  due_on date,
  car_item_id uuid references client_car_items,
  status text not null default 'open' check (status in ('open','submitted','accepted','rejected')),
  created_by uuid not null references users,
  created_at timestamptz not null default now()
);

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid not null references clients,
  evidence_request_id uuid references evidence_requests,
  original_name text not null,
  mime text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  sha256 text not null,
  storage_path text not null unique,
  scan_status text not null check (scan_status in ('clean','unscanned')),
  uploaded_by uuid not null references users,
  created_at timestamptz not null default now()
);

create table if not exists evidence_decisions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references evidence_requests,
  decision text not null check (decision in ('accepted','rejected')),
  comment text,
  decided_by uuid not null references users,
  created_at timestamptz not null default now(),
  check (decision <> 'rejected' or comment is not null)
);

-- Work
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid not null references clients,
  title text not null,
  assignee_membership_id uuid references memberships,
  due_on date,
  status text not null default 'open' check (status in ('open','done')),
  created_by uuid not null references users,
  created_at timestamptz not null default now()
);

create table if not exists gap_findings (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid not null references clients,
  rule_key text not null,
  severity text not null check (severity in ('high','medium','low')),
  fingerprint text not null,
  message text not null,
  next_action text not null,
  link text not null,
  state text not null default 'open' check (state in ('open','resolved','not_applicable')),
  na_reason text,
  resolved_by uuid references users,
  unique (client_id, fingerprint)
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  recipient_user_id uuid not null references users,
  kind text not null check (kind in ('breach_reported','dsar_logged','evidence_submitted','signed_off','questionnaire_completed','car_due')),
  message text not null,
  link text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Existing databases: widen the kind check above (schema.sql re-runs on every start; no migrations yet).
alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in ('breach_reported','dsar_logged','evidence_submitted','signed_off','questionnaire_completed','car_due'));

-- One row per CAR reminder stage sent (lib/reminders.ts). Keyed on the due date, so a new date starts a fresh cycle.
create table if not exists car_reminders (
  client_id uuid not null references clients on delete cascade,
  due_on date not null,
  days_before int not null,
  sent_at timestamptz not null default now(),
  primary key (client_id, due_on, days_before)
);

create table if not exists outbound_messages (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('email','sms')),
  recipient text not null,
  template_key text not null,
  status text not null default 'queued' check (status in ('queued','sent','failed')),
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  firm_id uuid,
  client_id uuid,
  actor_user_id uuid,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'
);

-- FR14.5: the activity log is append-only.
create or replace function audit_append_only() returns trigger language plpgsql as $$
begin raise exception 'audit_events is append-only'; end $$;
drop trigger if exists audit_events_no_change on audit_events;
create trigger audit_events_no_change before update or delete on audit_events for each row execute function audit_append_only();

create table if not exists ai_generations (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  client_id uuid,
  requested_by uuid not null,
  kind text not null check (kind in ('draft','qa_answer')),
  model text not null,
  status text not null check (status in ('done','failed','not_covered')),
  created_at timestamptz not null default now()
);

-- Platform content (Secretary). Firms read published rows only.
create table if not exists reg_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  doc_type text not null check (doc_type in ('act','regulation','directive','guidance','other')),
  version_label text not null,
  status text not null default 'draft' check (status in ('draft','published','retired')),
  retire_pending boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists reg_sections (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references reg_documents on delete cascade,
  section_ref text not null,
  heading text,
  body text not null,
  position int not null,
  tsv tsvector generated always as (to_tsvector('english', coalesce(section_ref,'') || ' ' || coalesce(heading,'') || ' ' || body)) stored
);
create index if not exists reg_sections_tsv on reg_sections using gin (tsv);

create table if not exists mi_criteria (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  question_key text not null,
  op text not null check (op in ('gte','yes','includes')),
  value text,
  source_ref text not null,
  position int not null,
  status text not null default 'draft' check (status in ('draft','published','retired')),
  retire_pending boolean not null default false
);

create table if not exists platform_settings (
  key text primary key,
  published_value text not null,
  draft_value text
);

create table if not exists publish_events (
  id uuid primary key default gen_random_uuid(),
  summary text not null,
  published_by uuid not null references users,
  published_at timestamptz not null default now()
);

create table if not exists import_jobs (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid references clients,
  import_type text not null check (import_type in ('clients_contacts','ropa_entries')),
  rows jsonb not null,
  status text not null default 'ready' check (status in ('ready','completed','cancelled')),
  created_by uuid not null references users,
  created_at timestamptz not null default now()
);

create index if not exists cv_parent on content_versions (parent_type, parent_id, version_no desc);
create index if not exists cv_review on content_versions (firm_id, status);
create index if not exists audit_firm on audit_events (firm_id, occurred_at desc);

-- Public site: "Request pilot access" submissions, read by DPO Copilot staff in the Secretary console.
create table if not exists pilot_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  firm text not null,
  client_count text,
  phone text,
  message text,
  created_at timestamptz not null default now()
);

-- Public blog, written in the Secretary console (lib/blog.ts). Cover image kept in the row: small, public, no client data.
create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null default '',
  body text not null default '',
  cover bytea,
  cover_mime text,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_by uuid not null references users,
  updated_at timestamptz not null default now()
);

-- CAR readiness: other high-risk findings and observations outside the Schedule 2 questions, per client and audit year.
create table if not exists car_findings (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid not null references clients,
  audit_year int not null,
  observation text not null,
  risk text not null default 'high' check (risk in ('high','medium','low')),
  recommendation text,
  status text not null default 'open' check (status in ('open','resolved')),
  created_by uuid not null references users,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists car_findings_client_year on car_findings (client_id, audit_year);

-- CAR audit report details per client and audit year: the consultant's narrative and sign-off inputs.
create table if not exists car_reports (
  client_id uuid not null references clients,
  audit_year int not null,
  background text,
  conclusion_notes text,
  verified_on date,
  maturity_override int check (maturity_override between 1 and 5),
  updated_by uuid references users,
  updated_at timestamptz not null default now(),
  primary key (client_id, audit_year)
);

-- Remediation tracker (lib/remediation.ts): one action per open CAR item or open finding, per client and audit year.
-- Built from the audit; owner, target date, status, evidence and date closed are then maintained here. "Overdue" is derived.
create table if not exists remediation_actions (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid not null references clients,
  audit_year int not null,
  source text not null check (source in ('item','finding')),
  source_key text not null,
  audit_part text not null,
  control_area text not null,
  non_conformity text not null,
  recommendation text not null,
  priority text not null check (priority in ('high','medium','low')),
  owner text,
  target_date date,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  evidence text,
  date_closed date,
  position int not null,
  updated_by uuid references users,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, audit_year, source, source_key)
);

-- Legitimate interest assessments (LIA) and cross-border transfer risk assessments (TIA), linked to a RoPA activity.
create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid not null references clients,
  kind text not null check (kind in ('lia','tia')),
  title text not null,
  assessment_year int not null,
  ropa_entry_id uuid references ropa_entries,
  answers jsonb not null default '{}',
  likelihood int check (likelihood between 1 and 5),
  impact int check (impact between 1 and 5),
  outcome text,
  status text not null default 'draft' check (status in ('draft','approved')),
  created_by uuid not null references users,
  approved_by uuid references users,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Files attached to an assessment (e.g. transfer evidence: contract clauses, certifications, adequacy decisions).
alter table files add column if not exists assessment_id uuid references assessments;

-- Client invoices: line items are chosen from the DPCO service scope (lib/invoice.ts) with amounts in naira.
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms,
  client_id uuid not null references clients,
  number text not null,
  issued_on date not null,
  due_on date,
  lines jsonb not null,
  vat_rate numeric not null default 0,
  notes text,
  status text not null default 'unpaid' check (status in ('unpaid','paid','cancelled')),
  paid_on date,
  created_by uuid not null references users,
  created_at timestamptz not null default now(),
  unique (firm_id, number)
);

-- Firm logo for invoices (data URL, small PNG/JPEG) and invoice email tracking.
alter table firms add column if not exists logo text;
alter table firms add column if not exists logo_w int;
alter table firms add column if not exists logo_h int;
alter table invoices add column if not exists sent_at timestamptz;
