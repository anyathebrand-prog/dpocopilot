import { test } from "node:test";
import assert from "node:assert/strict";
import { renewalSeason } from "./renewal-season.ts";

test("renewal season runs 1 November to 31 December", () => {
  assert.equal(renewalSeason("2026-10-31"), false);
  assert.equal(renewalSeason("2026-11-01"), true);
  assert.equal(renewalSeason("2026-12-31"), true);
  assert.equal(renewalSeason("2027-01-01"), false);
});
