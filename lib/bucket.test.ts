import { test } from "node:test";
import assert from "node:assert/strict";

Object.assign(process.env, { BUCKET_API_KEY: "k", BUCKET_PROJECT_ID: "p1", BUCKET_NAME: "docs" });
const { bucketOn, bucketPut, bucketGet } = await import("./bucket.ts");
const calls: { url: string; init?: RequestInit }[] = [];
let reply = () => new Response("{}", { status: 201 });
globalThis.fetch = (async (url: string, init?: RequestInit) => { calls.push({ url, init }); return reply(); }) as typeof fetch;

test("upload goes to the firm folder with the AuthToken header", async () => {
  assert.equal(bucketOn(), true);
  await bucketPut("firm-1", "abc.pdf", Buffer.from("x"), "application/pdf");
  const up = calls.at(-1)!;
  assert.equal(up.url, "https://buckets.cloudvantage.com.ng/bucketaas/p1/buckets-aas/docs/upload-object-folder/firm-1");
  assert.deepEqual(up.init?.headers, { AuthToken: "Bearer k" });
  assert.equal(((up.init?.body as FormData).get("file") as File).name, "abc.pdf");
});

test("upload error body and JSON download replies are failures", async () => {
  reply = () => new Response('{"error":"too big"}', { status: 201 });
  await assert.rejects(bucketPut("f", "a.png", Buffer.from("x"), "image/png"));
  reply = () => new Response('{"statusmessage":"not found"}', { status: 200, headers: { "content-type": "application/json" } });
  await assert.rejects(bucketGet("f", "a.png"));
  reply = () => new Response("PDFDATA", { headers: { "content-type": "application/pdf" } });
  assert.equal((await bucketGet("f", "a.pdf")).toString(), "PDFDATA");
});
