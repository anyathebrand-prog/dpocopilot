// Run: npm test  (Node 22.18+ strips TypeScript types natively)
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWATLocal, breachDeadline, dsarDeadline, deadlineState, countdown, readiness, findGaps, evaluateMI, parseCSV, todayWAT } from "./rules.ts";
import { buildInventory, missingRequired } from "./questionnaire.ts";

test("breach deadline is 72h after awareness, entered in WAT", () => {
  const aware = parseWATLocal("2026-10-30T23:30")!;
  assert.equal(aware.toISOString(), "2026-10-30T22:30:00.000Z");
  assert.equal(breachDeadline(aware).toISOString(), "2026-11-02T22:30:00.000Z"); // crosses month end
  assert.equal(parseWATLocal("30/10/2026"), null);
  assert.equal(countdown(breachDeadline(aware), aware), "72h 0m left");
});

test("WAT date rolls over at 23:00 UTC", () => {
  assert.equal(todayWAT(new Date("2026-02-28T23:30:00Z")), "2026-03-01");
});

test("DSAR deadline defaults to 30 days, across month and leap-year ends", () => {
  assert.equal(dsarDeadline("2026-01-15", 30), "2026-02-14");
  assert.equal(dsarDeadline("2028-02-10", 30), "2028-03-11");
});

test("deadline states", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  assert.equal(deadlineState(new Date("2025-12-31T23:59:00Z"), now, 86400_000), "overdue");
  assert.equal(deadlineState(new Date("2026-01-01T12:00:00Z"), now, 86400_000), "soon");
  assert.equal(deadlineState(new Date("2026-01-03T00:00:00Z"), now, 86400_000), "normal");
});

test("readiness excludes Not applicable from the score", () => {
  const r = readiness([
    { category_key: "governance", status: "complete" },
    { category_key: "governance", status: "missing" },
    { category_key: "governance", status: "not_applicable" },
    { category_key: "technology", status: "complete" },
  ]);
  assert.deepEqual(r.overall, { complete: 2, applicable: 3, pct: 67 });
  assert.equal(r.byCategory.governance.pct, 50);
  assert.equal(r.byCategory.data_processors.pct, 0);
});

test("seeded client returns every V1 gap type (PRD F12 acceptance)", () => {
  const gaps = findGaps({
    today: "2026-09-26",
    ropa: [
      { id: "r1", purpose: "Payroll", lawful_basis: null, retention_period: null, involves_sensitive: true, is_high_risk: true, has_transfer: true, transfer_safeguard: null, dpia_count: 0 },
      { id: "r2", purpose: "CCTV", lawful_basis: "legitimate_interest", retention_period: "30 days", involves_sensitive: false, is_high_risk: true, has_transfer: false, transfer_safeguard: null, dpia_count: 0 },
    ],
    approvedTemplates: ["privacy_notice"],
    evidence: [{ id: "e1", title: "Training records", due_on: "2026-09-01", status: "open" }],
    dsars: [{ id: "d1", requester_name: "A. Bello", deadline_on: "2026-09-30", status: "open" }],
    car: [{ id: "c1", item_text: "DPO designated", status: "missing" }],
  });
  const keys = new Set(gaps.map((g) => g.rule_key));
  for (const k of ["no_lawful_basis", "sensitive_without_dpia", "high_risk_without_dpia", "no_retention_period", "missing_required_policy", "transfer_without_safeguard", "evidence_overdue", "dsar_deadline_risk", "car_item_missing"])
    assert.ok(keys.has(k), `missing gap ${k}`);
  assert.equal(gaps.filter((g) => g.rule_key === "missing_required_policy").length, 2);
  assert.equal(gaps[0].severity, "high");
});

test("major-importance indicator is likely when any criterion is met", () => {
  const criteria = [
    { description: "Over 200 subjects", question_key: "subjects_6mo", op: "gte" as const, value: "200", source_ref: "s.65" },
    { description: "Significant", question_key: "mi_significance", op: "yes" as const, value: null, source_ref: "s.65" },
  ];
  assert.equal(evaluateMI(criteria, { subjects_6mo: "150", mi_significance: "no" }).result, "unlikely");
  const r = evaluateMI(criteria, { subjects_6mo: "5000", mi_significance: "no" });
  assert.equal(r.result, "likely");
  assert.deepEqual(r.reasoning.map((x) => x.met), [true, false]);
});

test("CSV parser handles quotes, commas, CRLF and BOM", () => {
  assert.deepEqual(parseCSV('﻿name,sector\r\n"Ikeja Clinic, Ltd","He said ""hi"""\r\n\r\nB,\n'), [
    ["name", "sector"], ["Ikeja Clinic, Ltd", 'He said "hi"'], ["B", ""],
  ]);
});

test("questionnaire builds inventory and one proposed RoPA entry per purpose", () => {
  const a = { subjects: ["Employees"], categories: ["Contact details", "Health information"], purposes: "Payroll\nSick leave", transfers_yes: "yes", transfer_countries: "Google Drive (USA)", retention_default: "6 years" };
  const { items, ropa } = buildInventory(a);
  assert.equal(ropa.length, 2);
  assert.equal(ropa[0].involves_sensitive, true);
  assert.equal(ropa[0].has_transfer, true);
  assert.equal(ropa[0].transfer_safeguard, null);
  assert.ok(items.some((i) => i.item_type === "data_category" && i.is_sensitive));
  assert.ok(missingRequired(a).some((q) => q.key === "subjects_6mo"));
});

test("TOTP matches the RFC 6238 SHA-1 test vector", async () => {
  const { totp, base32, verifyTotp } = await import("./crypto.ts");
  const secret = base32(Buffer.from("12345678901234567890"));
  assert.equal(totp(secret, 59_000, 8), "94287082");
  assert.equal(totp(secret, 1111111109_000, 8), "07081804");
  assert.ok(verifyTotp(secret, totp(secret, 1_000_000), 1_020_000));
  assert.ok(!verifyTotp(secret, "12345"));
});

test("import validation lists row errors before anything is saved", async () => {
  const { validateImport } = await import("./importer.ts");
  assert.match(validateImport("clients_contacts", "name,sector\nA,B").error!, /missing these columns/);
  const r = validateImport("clients_contacts", "name,sector,size,contact_name,contact_email\nIkeja Clinic,Health,,Ada,ada@x.ng\n,Retail,,,\nIkeja clinic,,,,bad-email", ["Other Ltd"]);
  assert.deepEqual(r.rows.map((x) => x.errors.length), [0, 1, 2]);
  assert.equal(r.rows[2].n, 4);
  const ropa = validateImport("ropa_entries", "purpose,lawful_basis,data_subjects,data_categories,recipients,retention_period,security_measures,system_owner,transfer_outside_nigeria,transfer_safeguard,sensitive_data\nPayroll,Legal obligation,Staff,,,,,,yes,,no\nCCTV,maybe,,,,,,,,,");
  assert.equal(ropa.rows[0].data.lawful_basis, "legal_obligation");
  assert.equal(ropa.rows[0].data.has_transfer, true);
  assert.equal(ropa.rows[1].errors.length, 1);
});

test("library ingestion splits pasted text into citable sections", async () => {
  const { splitSections } = await import("./rules.ts");
  const s = splitSections("Preamble text\nSection 40 — Personal data breaches\nNotify within 72 hours.\nMore.\n\nSection 41(1): Transfers\nAdequacy required.");
  assert.deepEqual(s.map((x) => x.section_ref), ["Full text", "Section 40", "Section 41(1)"]);
  assert.equal(s[1].heading, "Personal data breaches");
  assert.equal(s[1].body, "Notify within 72 hours.\nMore.");
});
