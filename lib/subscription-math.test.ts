import { test } from "node:test";
import assert from "node:assert/strict";
import { subState, nextEnd, reminderStage } from "./subscription-math.ts";

test("subscription state: unpaid, active through the end date, 7 days' grace, then locked", () => {
  assert.equal(subState(null, "2026-11-06"), "unpaid");
  assert.equal(subState("2026-11-06", "2026-11-06"), "active");
  assert.equal(subState("2026-11-06", "2026-11-07"), "grace");
  assert.equal(subState("2026-11-06", "2026-11-13"), "grace");
  assert.equal(subState("2026-11-06", "2026-11-14"), "locked");
});

test("renewal: early or in grace adds a year to the end date; first payment or after lockout, a year from today", () => {
  assert.equal(nextEnd(null, "2026-11-06"), "2027-11-06");
  assert.equal(nextEnd("2026-12-01", "2026-11-06"), "2027-12-01");
  assert.equal(nextEnd("2026-11-01", "2026-11-06"), "2027-11-01");
  assert.equal(nextEnd("2026-10-01", "2026-11-06"), "2027-11-06");
  assert.equal(nextEnd(null, "2028-02-29"), "2029-02-28");
});

test("reminder stages: 30, 7 and 1 days before, the day after the end, and at lockout", () => {
  assert.equal(reminderStage("2026-12-31", "2026-11-06"), null);
  assert.equal(reminderStage("2026-12-06", "2026-11-06"), "d30");
  assert.equal(reminderStage("2026-11-10", "2026-11-06"), "d7");
  assert.equal(reminderStage("2026-11-07", "2026-11-06"), "d1");
  assert.equal(reminderStage("2026-11-06", "2026-11-06"), "d1");
  assert.equal(reminderStage("2026-11-05", "2026-11-06"), "grace");
  assert.equal(reminderStage("2026-10-29", "2026-11-06"), "locked");
});
