import { test } from "node:test";
import assert from "node:assert/strict";

Object.assign(process.env, { CLOUDVANTAGE_EMAIL: "e@x.ng", CLOUDVANTAGE_PASSWORD: "pw", BUCKET_PROJECT_ID: "p1", BUCKET_NAME: "docs" });
const { bucketOn, bucketPut, bucketGet, generateToken } = await import("./bucket.ts");
const calls: { url: string; init?: RequestInit }[] = [];
let tokens = 0, nextUnauthorized = false, reply = () => new Response("{}", { status: 201 });
const tokenReply = (status = 200, body: object = { key: `KEY${++tokens}`, expires_at: new Date(Date.now() + 864e5).toISOString(), statuscode: "00" }) =>
  new Response(JSON.stringify(body), { status });
let tokenResp = () => tokenReply();
globalThis.fetch = (async (url: string, init?: RequestInit) => {
  calls.push({ url, init });
  if (url.endsWith("/tokens/generate-token")) return tokenResp();
  if (nextUnauthorized) { nextUnauthorized = false; return new Response('{"error":"expired"}', { status: 401 }); }
  return reply();
}) as typeof fetch;
const authOf = (c: { init?: RequestInit }) => (c.init?.headers as Record<string, string>).AuthToken;

test("token is generated once, sent as AuthToken: Bearer, and reused", async () => {
  assert.equal(bucketOn(), true);
  await bucketPut("firm-1", "abc.pdf", Buffer.from("x"), "application/pdf");
  await bucketPut("firm-1", "def.pdf", Buffer.from("x"), "application/pdf");
  assert.equal(calls.filter((c) => c.url.endsWith("generate-token")).length, 1);
  const up = calls.at(-1)!;
  assert.equal(up.url, "https://buckets.cloudvantage.com.ng/bucketaas/p1/buckets-aas/docs/upload-object-folder/firm-1");
  assert.equal(authOf(up), "Bearer KEY1");
  assert.equal(((up.init?.body as FormData).get("file") as File).name, "def.pdf");
});

test("a 401 regenerates the token and retries once", async () => {
  reply = () => new Response("PDFDATA", { headers: { "content-type": "application/pdf" } });
  nextUnauthorized = true;
  assert.equal((await bucketGet("f", "a.pdf")).toString(), "PDFDATA");
  assert.equal(authOf(calls.at(-1)!), "Bearer KEY2");
});

test("token errors: 400, 502, and 200 without statuscode 00", async () => {
  tokenResp = () => tokenReply(400, { error: "Email and password are required" });
  await assert.rejects(generateToken(), /bad request/);
  tokenResp = () => tokenReply(502, { error: "Failed to reach account service" });
  await assert.rejects(generateToken(), /unreachable/);
  tokenResp = () => tokenReply(200, { key: "K", statuscode: "99", statusmessage: "Invalid credentials" });
  await assert.rejects(generateToken(), /Invalid credentials/);
});

test("upload error body and JSON download replies are failures", async () => {
  tokenResp = () => tokenReply();
  reply = () => new Response('{"error":"too big"}', { status: 201 });
  await assert.rejects(bucketPut("f", "a.png", Buffer.from("x"), "image/png"));
  reply = () => new Response('{"statusmessage":"not found"}', { status: 200, headers: { "content-type": "application/json" } });
  await assert.rejects(bucketGet("f", "a.png"));
});
