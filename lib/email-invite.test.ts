import { test } from "node:test";
import assert from "node:assert/strict";
import { inviteHtml, inviteText } from "./email-invite.ts";

const v = { firm_name: "Ade & Co <Ltd>", inviter_name: "Ada", role: "Associate", expires_in: "7 days", invite_url: "https://x.ng/invite/abc", email: "a@b.ng" };

test("fills every placeholder and escapes user-entered names", () => {
  const h = inviteHtml(v);
  assert.doesNotMatch(h, /\{\{\w+\}\}/);
  assert.match(h, /Ade &amp; Co &lt;Ltd&gt;/);
  assert.doesNotMatch(h, /<Ltd>/);
  assert.match(h, /href="https:\/\/x\.ng\/invite\/abc"/);
});

test("plain-text version carries the link", () => assert.match(inviteText(v), /https:\/\/x\.ng\/invite\/abc/));
