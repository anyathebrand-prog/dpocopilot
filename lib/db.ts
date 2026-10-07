import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { seed } from "./seed";

// Real Postgres 16 when DATABASE_URL is set (each DPCO install, TRD §5). Without it, embedded PGlite in ./data
// so local dev runs with no install. The SQL is plain Postgres either way.
type Rows<T> = Promise<{ rows: T[] }>;
export type Tx = { query<T = Record<string, any>>(sql: string, params?: unknown[]): Rows<T> };
export type Db = Tx & { exec(sql: string): Promise<unknown>; transaction<T>(fn: (t: Tx) => Promise<T>): Promise<T> };

const g = globalThis as unknown as { __db?: Promise<Db> };

async function open(): Promise<Db> {
  const db = process.env.DATABASE_URL ? await openPostgres(process.env.DATABASE_URL) : await openPGlite();
  await db.exec(readFileSync(path.join(process.cwd(), "lib", "schema.sql"), "utf8"));
  await seed(db);
  return db;
}

async function openPostgres(url: string): Promise<Db> {
  const { Pool, types } = await import("pg");
  // Keep `date` columns as 'YYYY-MM-DD' strings; timestamps stay Date objects.
  types.setTypeParser(types.builtins.DATE, (v: string) => v);
  const pool = new Pool({ connectionString: url });
  const query = (c: { query: Function }) => <T>(sql: string, params: unknown[] = []) => c.query(sql, params) as Rows<T>;
  return {
    query: query(pool),
    exec: (sql) => pool.query(sql),
    async transaction(fn) {
      const c = await pool.connect();
      try {
        await c.query("begin");
        const r = await fn({ query: query(c) });
        await c.query("commit");
        return r;
      } catch (e) {
        await c.query("rollback");
        throw e;
      } finally {
        c.release();
      }
    },
  };
}

async function openPGlite(): Promise<Db> {
  const { PGlite, types } = await import("@electric-sql/pglite");
  const dir = path.join(process.cwd(), "data", "pg");
  mkdirSync(dir, { recursive: true });
  const db = await PGlite.create(dir, { parsers: { [types.DATE]: (v: string) => v } });
  // PGlite's files can be left unreadable if the process dies mid-write, so close it cleanly on Ctrl+C / stop.
  // ponytail: a hard kill (closing the terminal, taskkill /F) still can't be caught; installs use real Postgres.
  const close = () => { db.close().finally(() => process.exit(0)); };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
  return db as unknown as Db;
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
