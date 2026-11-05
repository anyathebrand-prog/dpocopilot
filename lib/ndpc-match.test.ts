import { test } from "node:test";
import assert from "node:assert/strict";
import { findFilings, norm } from "./ndpc-match.ts";

const list = [
  { name: "JULIUS BERGER NIGERIA PLC (JULIUS BERGER)", year: "2025", ref: "a1" },
  { name: "INTERSWITCH LIMITED", year: "2025", ref: "a2" },
  { name: "Interswitch Financial Inclusion Services Ltd", year: "2025", ref: "a3" },
  { name: "Providus Bank Limited", year: "2025", ref: "a4" },
];

test("normalising drops case, suffixes and brackets", () => {
  assert.equal(norm("JULIUS BERGER NIGERIA PLC (JULIUS BERGER)"), "julius berger");
  assert.equal(norm("Interswitch Ltd."), "interswitch");
});

test("exact match first, then names containing every word", () => {
  const r = findFilings(list, "Interswitch Ltd");
  assert.deepEqual(r.map((x) => x.ref), ["a2", "a3"]);
  assert.equal(r[0].exact, true); assert.equal(r[1].exact, false);
  assert.equal(findFilings(list, "julius berger")[0].ref, "a1");
  assert.equal(findFilings(list, "Providus Bank")[0].ref, "a4");
  assert.deepEqual(findFilings(list, "Zenith Bank"), []);
  assert.deepEqual(findFilings(list, "   "), []);
});
