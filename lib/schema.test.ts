import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

// schema.sql runs on every app start, against a database that already holds data. Re-running it must never fail.
const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");

test("schema.sql re-runs on a database holding a notification of every allowed kind", async () => {
  const db = new PGlite(); // in-memory
  await db.exec(schema);
  const lists = [...schema.matchAll(/add constraint notifications_kind_check check \(kind in \(([^)]*)\)\)/g)];
  const kinds = [...lists.at(-1)![1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]); // the final, effective list
  assert.ok(kinds.length > 6);
  const u = (await db.query<{ id: string }>("insert into users (name, email, password_hash) values ('T', 't@x.ng', 'x') returning id")).rows[0].id;
  const f = (await db.query<{ id: string }>("insert into firms (name, created_by) values ('F', $1) returning id", [u])).rows[0].id;
  for (const k of kinds) await db.query("insert into notifications (firm_id, recipient_user_id, kind, message, link) values ($1,$2,$3,'m','/app')", [f, u, k]);
  await db.exec(schema); // the next app start
  await db.close();
});
