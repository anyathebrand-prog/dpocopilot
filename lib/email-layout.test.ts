import { test } from "node:test";
import assert from "node:assert/strict";
import { layoutHtml } from "./email-layout.ts";

test("link becomes a button; text is escaped; DPO Copilot logo by default", () => {
  const h = layoutHtml({ heading: "New invoice", text: "Ade & Co sent you invoice <INV-1>. Log in to view: https://x.ng/portal/invoices", button: "View invoice" });
  assert.match(h, /href="https:\/\/x\.ng\/portal\/invoices"[^>]*>View invoice</);
  assert.match(h, /Ade &amp; Co sent you invoice &lt;INV-1&gt;\. Log in to view\.</);
  assert.match(h, /cid:dpocopilot-logo/);
});

test("client-branded emails carry the client's name and no DPO Copilot branding", () => {
  const h = layoutHtml({ heading: "We have received your data request", text: "Thank you.", brand: "Accra Bank" });
  assert.match(h, />Accra Bank</);
  assert.doesNotMatch(h, /dpocopilot|DPO Copilot/i);
  assert.doesNotMatch(h, /<a href/);
});
