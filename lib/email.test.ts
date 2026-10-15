import { test } from "node:test";
import assert from "node:assert/strict";

Object.assign(process.env, { RESEND_API_KEY: "re_test", EMAIL_FROM: "DPO Copilot <no-reply@example.ng>" });
const { emailOn, deliver } = await import("./email.ts");
let sent: { url: string; init: RequestInit } | null = null, status = 200;
globalThis.fetch = (async (url: string, init: RequestInit) => { sent = { url, init }; return new Response("{}", { status }); }) as typeof fetch;

test("sends through Resend with the key, sender, subject and text", async () => {
  assert.equal(emailOn(), true);
  assert.equal(await deliver("a@b.ng", "invoice_issued", "Log in to view", null, []), true);
  assert.equal(sent!.url, "https://api.resend.com/emails");
  assert.equal((sent!.init.headers as Record<string, string>).Authorization, "Bearer re_test");
  assert.deepEqual(JSON.parse(sent!.init.body as string), { from: "DPO Copilot <no-reply@example.ng>", to: ["a@b.ng"], subject: "New invoice", text: "Log in to view" });
});

test("a given subject wins; a Resend error returns false instead of throwing", async () => {
  await deliver("a@b.ng", "dsar_completed", "Dear X", "Your request has been completed", []);
  assert.equal(JSON.parse(sent!.init.body as string).subject, "Your request has been completed");
  status = 422;
  assert.equal(await deliver("a@b.ng", "otp", "code", null, []), false);
});
