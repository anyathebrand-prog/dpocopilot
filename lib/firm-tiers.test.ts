import { test } from "node:test";
import assert from "node:assert/strict";
import { tierForTeam, seatFree, upgradeCost, isUpgrade } from "./firm-tiers.ts";

test("team size picks the smallest plan that seats it", () => {
  for (const n of [1, 2, 3]) assert.equal(tierForTeam(n), "starter");
  for (const n of [4, 7, 10]) assert.equal(tierForTeam(n), "growth");
  for (const n of [11, 50, 500]) assert.equal(tierForTeam(n), "firm");
});

test("seat limits: Starter 3, Growth 10, Firm unlimited", () => {
  assert.equal(seatFree("starter", 2), true);
  assert.equal(seatFree("starter", 3), false);
  assert.equal(seatFree("growth", 9), true);
  assert.equal(seatFree("growth", 10), false);
  assert.equal(seatFree("firm", 10_000), true);
});

test("upgrade costs the fee difference for the days left", () => {
  assert.equal(upgradeCost(500_000, 1_500_000, 365), 1_000_000);
  assert.equal(upgradeCost(500_000, 1_500_000, 73), 200_000);
  assert.equal(upgradeCost(1_500_000, 3_000_000, 1), Math.ceil(1_500_000 / 365));
  assert.equal(upgradeCost(1_500_000, 500_000, 100), 0);
  assert.equal(upgradeCost(500_000, 1_500_000, 0), 0);
  assert.equal(isUpgrade("starter", "growth"), true);
  assert.equal(isUpgrade("firm", "growth"), false);
});
