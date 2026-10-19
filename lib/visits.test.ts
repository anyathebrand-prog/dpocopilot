import { test } from "node:test";
import assert from "node:assert/strict";
import { countedPath, sourceOf, isBot } from "./visits.ts";

test("only public pages are counted", () => {
  assert.equal(countedPath("/"), "/");
  assert.equal(countedPath("/blog/car-deadline-2027"), "/blog/car-deadline-2027");
  assert.equal(countedPath("/app"), null);
  assert.equal(countedPath("/portal/invoices"), null);
  assert.equal(countedPath("/blog/x/../app"), null);
  assert.equal(countedPath(42), null);
});

test("source is the referring host, direct, or internal", () => {
  assert.equal(sourceOf("https://www.google.com/search?q=dpo", "dpocopilot.ng"), "google.com");
  assert.equal(sourceOf("", "dpocopilot.ng"), "direct");
  assert.equal(sourceOf("https://dpocopilot.ng/pricing", "dpocopilot.ng"), null);
  assert.equal(sourceOf("https://www.dpocopilot.ng/", "dpocopilot.ng"), null);
});

test("bots are skipped", () => {
  assert.equal(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)"), true);
  assert.equal(isBot("Mozilla/5.0 (Windows NT 10.0) Chrome/130"), false);
  assert.equal(isBot(null), true);
});
