import { test } from "node:test";
import assert from "node:assert/strict";
import { share, available, validWithdrawal } from "./wallet-math.ts";

test("share of an invoice, to the kobo", () => {
  assert.equal(share(500000, 70), 350000);
  assert.equal(share(333333.33, 10), 33333.33);
  assert.equal(share(1000, 0), 0);
});

test("available balance ignores rejected withdrawals", () => {
  assert.equal(available(100000, [{ amount: 30000, status: "paid" }, { amount: 20000, status: "pending" }, { amount: 50000, status: "rejected" }]), 50000);
  assert.equal(available(0, []), 0);
});

test("withdrawals: positive, whole kobo, not more than available", () => {
  assert.equal(validWithdrawal(50000, 50000), true);
  assert.equal(validWithdrawal(50000.01, 50000), false);
  assert.equal(validWithdrawal(0, 50000), false);
  assert.equal(validWithdrawal(-5, 50000), false);
  assert.equal(validWithdrawal(10.005, 50000), false);
  assert.equal(validWithdrawal(NaN, 50000), false);
});
