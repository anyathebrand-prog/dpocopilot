import { test } from "node:test";
import assert from "node:assert/strict";
import { overall, pct } from "./score.ts";

test("average of the measurable parts; nothing measurable = null", () => {
  const p = (x: number | null) => ({ key: "k", label: "l", pct: x, detail: "" });
  assert.equal(overall([p(80), p(null), p(60)]), 70);
  assert.equal(overall([p(null), p(null)]), null);
  assert.equal(pct(1, 3), 33);
  assert.equal(pct(0, 0), null);
});
