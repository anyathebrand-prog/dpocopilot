import { test } from "node:test";
import assert from "node:assert/strict";
import { COUNTRY, money, moneyIn, parseAmount, countryOf, CAR_COUNTRIES } from "./country.ts";
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

test("per-client country: Ghana uses cedis and 20% VAT, has no CAR; unknown codes fall back to the install", () => {
  const gh = countryOf("gh");
  assert.equal(gh.code, "GH");
  assert.equal(moneyIn("GHS", 12000.5), "GH₵12,000.50");
  assert.equal(moneyIn(null, 100), "₦100.00");
  assert.equal(gh.vatRate, 20);
  assert.equal(gh.regulator.short, "DPC");
  assert.deepEqual(CAR_COUNTRIES, ["NG"]);
  assert.equal(countryOf("XX").code, "NG");
  assert.equal(countryOf(null).code, "NG");
  assert.equal(parseAmount("GH₵1,200.50"), 1200.5);
});
