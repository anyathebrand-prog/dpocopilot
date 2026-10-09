import { test } from "node:test";
import assert from "node:assert/strict";
import { matchUnit, clientDepartments, workplanFor } from "./audit-workplan.ts";

test("client department names match the work plan's units", () => {
  const m = (d: string) => matchUnit(d)?.sheet ?? null;
  assert.equal(m("Human Resources"), "DEPT-HR Establishments");
  assert.equal(m("ICT"), "DIR-ICT");
  assert.equal(m("Finance"), "DEPT-Bursary");
  assert.equal(m("Bursary"), "DEPT-Bursary");
  assert.equal(m("Faculty of Law"), "FAC-Law");
  assert.equal(m("Legal Unit"), "DEPT-Legal Unit");
  assert.equal(m("Health Services"), "DIR-Health Services");
  assert.equal(m("Admissions Office"), "DEPT-Admissions");
  assert.equal(m("Marketing"), "DEPT-Info & PR");
  assert.equal(m("Customer Service"), null);
});

test("departments come from the organogram text, then the onboarding list", () => {
  const d = clientDepartments("Board of Directors\nManaging Director / CEO\nHead, Finance\nICT Department\nHead of Marketing", ["Finance", "Customer Service"]);
  assert.deepEqual(d, ["Finance", "ICT Department", "Marketing", "Customer Service"]);
});

test("a department's plan has the 22 base controls worded for it plus the unit's own controls", () => {
  const p = workplanFor("Human Resources", [{ purpose: "Payroll", data_categories: "Bank details, NIN", system_owner: "SAP HR" }]);
  assert.equal(p.unit?.sheet, "DEPT-HR Establishments");
  assert.equal(p.rows.length, 25);
  assert.equal(p.rows[0].ref, "HR-01");
  assert.match(p.rows[0].procedure, /Walk through Human Resources's key processing \(Payroll\)/);
  assert.match(p.rows[1].procedure, /\(Bank details, NIN\)/);
  assert.ok(p.rows.slice(22).every((r) => r.specific) && p.rows[22].area === "Recruitment data");
  assert.equal(workplanFor("Customer Service").rows.length, 22);
});
