import { PGlite, types } from "@electric-sql/pglite";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { seed } from "./seed";

// ponytail: embedded Postgres (PGlite) in ./data so the app runs with no install.
// Production swaps this for a real Postgres 16 in Nigeria (TRD §5); the SQL is plain Postgres.
type Db = PGlite;
export type Tx = Pick<PGlite, "query">;

const g = globalThis as unknown as { __db?: Promise<Db> };

async function open(): Promise<Db> {
  const dir = path.join(process.cwd(), "data", "pg");
  mkdirSync(dir, { recursive: true });
  // Keep `date` columns as 'YYYY-MM-DD' strings; timestamps stay Date objects.
  const db = await PGlite.create(dir, { parsers: { [types.DATE]: (v: string) => v } });
  await db.exec(readFileSync(path.join(process.cwd(), "lib", "schema.sql"), "utf8"));
  await seed(db);
  return db;
}

export function db() {
  g.__db ??= open();
  return g.__db;
}

export async function q<T = Record<string, any>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await (await db()).query<T>(sql, params)).rows;
}

export async function one<T = Record<string, any>>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return (await q<T>(sql, params))[0];
}

export async function tx<T>(fn: (t: Tx) => Promise<T>): Promise<T> {
  return (await db()).transaction(fn);
}
