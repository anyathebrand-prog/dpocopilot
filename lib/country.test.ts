import { test } from "node:test";
import assert from "node:assert/strict";
import { COUNTRY, money, parseAmount } from "./country.ts";
import { todayWAT, fmtWAT, breachDeadline } from "./rules.ts";

test("default install is Nigeria: naira, 7.5% VAT, WAT, 72-hour breach clock", () => {
  assert.equal(COUNTRY.code, "NG");
  assert.equal(money(1500000), "₦1,500,000.00");
  assert.equal(COUNTRY.vatRate, 7.5);
  assert.equal(todayWAT(new Date("2026-10-10T23:30:00Z")), "2026-10-11"); // 00:30 WAT next day
  assert.match(fmtWAT("2026-10-10T09:00:00Z"), /10:00 WAT$/);
  assert.equal(+breachDeadline(new Date("2026-10-10T00:00:00Z")) - Date.parse("2026-10-10T00:00:00Z"), 72 * 3600_000);
});

test("typed amounts parse with or without commas and the currency symbol, and reject anything else", () => {
  assert.equal(parseAmount("1,500,000"), 1500000);
  assert.equal(parseAmount("₦250000.50"), 250000.5);
  assert.ok(Number.isNaN(parseAmount("abc")));
  assert.ok(Number.isNaN(parseAmount("-5")));
});
