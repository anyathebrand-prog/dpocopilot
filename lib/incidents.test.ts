import { test } from "node:test";
import assert from "node:assert/strict";
import { computed, dashboard } from "./incidents.ts";

test("72-hour NDPC deadline and notification status follow the register's formulas", () => {
  assert.deepEqual(computed({ ndpc_required: "Yes", discovered_on: "2026-10-05", ndpc_notified_on: "2026-10-07" }, "2026-10-09"), { deadline: "2026-10-08", days: 2, status: "Notified within 72h" });
  assert.equal(computed({ ndpc_required: "Yes", discovered_on: "2026-10-01", ndpc_notified_on: "2026-10-06" }).status, "Notified late");
  assert.equal(computed({ ndpc_required: "Yes", discovered_on: "2026-10-01" }, "2026-10-09").status, "Overdue");
  assert.equal(computed({ ndpc_required: "Yes", discovered_on: "2026-10-08" }, "2026-10-09").status, "Pending");
  assert.deepEqual(computed({ ndpc_required: "No", discovered_on: "2026-10-01" }), { deadline: "", days: null, status: "Not required" });
});

test("dashboard counts match the register", () => {
  const m = dashboard([
    { severity: "High", status: "Closed", ndpc_required: "Yes", discovered_on: "2026-10-01", ndpc_notified_on: "2026-10-02", subjects_count: "120" },
    { severity: "Low", status: "Reported", ndpc_required: "Yes", discovered_on: "2026-10-01", subjects_count: "5" },
  ], "2026-10-09");
  assert.deepEqual([m.total, m.open, m.closed, m.highCritical, m.required, m.notified, m.within, m.late, m.overdue, m.subjects], [2, 1, 1, 1, 2, 1, 1, 0, 1, 125]);
});
