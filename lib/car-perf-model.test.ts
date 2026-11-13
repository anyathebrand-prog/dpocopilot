import { test } from "node:test";
import assert from "node:assert/strict";
import { score, kpiScore, filingStatus, nextDeadline, checkSettings, DEFAULT_SETTINGS, r1, type Value } from "./car-perf-model.ts";

// The specification's indicative five-year sample (test fixtures).
const SAMPLE: Record<string, (number | string)[]> = {
  "GOV-1": [45, 65, 80, 92, 100], "GOV-2": [35, 60, 78, 88, 95], "GOV-3": ["Late", "On time", "On time", "On time", "On time"],
  "SEC-1": [6, 5, 3, 2, 1], "SEC-2": [50, 75, 100, 100, 100], "SEC-3": [40, 60, 75, 85, 95],
  "ACC-1": [30, 55, 75, 90, 100], "ACC-2": [50, 68, 82, 92, 97], "ACC-3": [24, 16, 10, 6, 3],
  "CBT-1": [20, 45, 70, 85, 95], "DPR-1": [25, 50, 70, 85, 95], "DPR-2": [20, 45, 65, 80, 95],
};
const year = (y: number): Record<string, Value> => Object.fromEntries(Object.entries(SAMPLE).map(([k, v]) => [k, { raw: v[y] }]));

test("sample overall scores match the specification to 1 decimal place", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map((y) => r1(score(year(y)).overall!)), [34.7, 59.4, 77.5, 88.0, 96.0]);
});

test("sample category scores and bands", () => {
  const y1 = score(year(0)), y4 = score(year(3));
  assert.deepEqual(Object.values(y1.cats).map((x) => r1(x!)), [43.3, 43.3, 33.3, 20.0, 22.5]);
  assert.equal(r1(y4.cats.dpr!), 82.5);
  assert.deepEqual([0, 1, 2, 3, 4].map((y) => score(year(y)).band), ["Red", "Red", "Amber", "Green", "Green"]);
});

test("count KPIs are scored against the tolerance, never below zero", () => {
  assert.equal(kpiScore("SEC-1", { raw: 6 }), 40);
  assert.equal(kpiScore("ACC-3", { raw: 24 }), 20);
  assert.equal(kpiScore("SEC-1", { raw: 15 }), 0);
  assert.equal(kpiScore("SEC-1", { raw: 5 }, { ...DEFAULT_SETTINGS, tolerances: { "SEC-1": 20, "ACC-3": 30 } }), 75);
});

test("a zero denominator is N/A and left out of its category", () => {
  const v = year(0);
  v["SEC-2"] = { numerator: 0, denominator: 0 };
  assert.equal(score(v).kpi["SEC-2"], null);
  assert.equal(r1(score(v).cats.sec!), 40); // mean of SEC-1 (40) and SEC-3 (40) only
});

test("an all-N/A category's weight is shared among the others in proportion", () => {
  const v = year(4);
  v["CBT-1"] = { numerator: 0, denominator: 0 };
  const s = score(v);
  assert.equal(s.cats.cbt, null);
  const c = s.cats;
  const expected = (0.25 * c.gov! + 0.25 * c.sec! + 0.2 * c.acc! + 0.15 * c.dpr!) / 0.85;
  assert.equal(r1(s.overall!), r1(expected));
});

test("filing status from the filing date", () => {
  assert.equal(filingStatus(2025, "2026-03-31"), "On time");
  assert.equal(filingStatus(2025, "2026-04-01"), "Late");
  assert.equal(filingStatus(2025, null), "Not filed");
  assert.equal(kpiScore("GOV-3", { raw: "Late" }), 50);
});

test("next filing deadline and settings validation", () => {
  assert.deepEqual(nextDeadline("2026-11-12"), { date: "2027-03-31", days: 139 });
  assert.deepEqual(nextDeadline("2027-03-31"), { date: "2027-03-31", days: 0 });
  assert.equal(checkSettings(DEFAULT_SETTINGS), null);
  assert.match(checkSettings({ ...DEFAULT_SETTINGS, weights: { gov: 30, sec: 25, acc: 20, cbt: 15, dpr: 15 } })!, /100%/);
});
