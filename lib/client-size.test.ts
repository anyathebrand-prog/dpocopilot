import { test } from "node:test";
import assert from "node:assert/strict";
import { sizeFor } from "./client-size.ts";

test("bands by data subjects and departments, larger band wins", () => {
  assert.equal(sizeFor(500, 10), "small");
  assert.equal(sizeFor(501, 1), "medium");
  assert.equal(sizeFor(1000, 20), "medium");
  assert.equal(sizeFor(1001, 1), "large");
  assert.equal(sizeFor(100, 11), "medium");
  assert.equal(sizeFor(100, 21), "large");
  assert.equal(sizeFor(0, 0), "small");
});
