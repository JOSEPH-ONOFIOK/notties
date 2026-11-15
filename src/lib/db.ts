import "server-only";
import { SCHEMA_SQL, SEED } from "./schema";

/**
 * One tiny query interface over two drivers:
 *  - DATABASE_URL set  → node-postgres Pool (Neon / Supabase / any Postgres). Production.
 *  - DATABASE_URL unset → PGlite, an embedded Postgres persisted to .data/pglite. Zero-setup dev.
 *
 * Every mutation in the game runs inside `withTx`, which hands the callback a client bound to a
 * single transaction, so `SELECT … FOR UPDATE` row locks, unique constraints and idempotency keys
 * all behave the same on both drivers.
 */
export type Row = object;
export interface Q {
  query<T extends Row = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

interface Driver extends Q {
  /** Run a multi-statement script (schema migrations). No parameters. */
  exec(text: string): Promise<void>;
  withTx<T>(fn: (q: Q) => Promise<T>): Promise<T>;
}

declare global {
  var __nottiesDb: Promise<Driver> | undefined;
}

async function makePg(url: string): Promise<Driver> {
  const pg = await import("pg");
  const { Pool } = pg.default ?? pg;
  // DATE columns stay "YYYY-MM-DD" strings (the default turns them into local-midnight Dates).
  (pg.default ?? pg).types.setTypeParser(1082, (v: string) => v);
  const pool = new Pool({
    connectionString: url,
    max: 5,
    ssl: process.env.DATABASE_SSL === "false" || /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
  });
  return {
    query: (text, params) => pool.query(text, params as unknown[]) as never,
    exec: async (text) => {
      await pool.query(text);
    },
    async withTx(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const out = await fn({ query: (t, p) => client.query(t, p as unknown[]) as never });
        await client.query("COMMIT");
        return out;
      } catch (e) {
        await client.query("ROLLBACK").catch(() => {});
        throw e;
      } finally {
        client.release();
      }
    },
  };
}

async function makePglite(): Promise<Driver> {
  const { PGlite } = await import("@electric-sql/pglite");
  const path = await import("node:path");
  const fs = await import("node:fs");
  // Vercel's filesystem is read-only except /tmp. Without a real database there, data lives in
  // /tmp: fine for a preview, but it resets on every cold start and isn't shared between servers.
  const onServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  const dir = onServerless ? "/tmp/notties-pglite" : path.join(process.cwd(), ".data", "pglite");
  if (onServerless) console.warn("[notties] No DATABASE_URL set: using a temporary database in /tmp. Data will reset. Add a Postgres DATABASE_URL in Vercel.");
  fs.mkdirSync(dir, { recursive: true });
  const db = await PGlite.create({ dataDir: dir, parsers: { 1082: (v: string) => v } });
  return {
    query: (text, params) => db.query(text, params as unknown[]) as never,
    exec: async (text) => {
      await db.exec(text);
    },
    withTx: (fn) => db.transaction((tx) => fn({ query: (t, p) => tx.query(t, p as unknown[]) as never })),
  };
}

async function init(): Promise<Driver> {
  // DATABASE_URL, or the names Vercel's Neon / Postgres integrations set automatically.
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_PRISMA_URL;
  const d = url ? await makePg(url) : await makePglite();
  await d.exec(SCHEMA_SQL);
  await SEED(d);
  return d;
}

/** True on Vercel/serverless with no Postgres configured: logins and data can't persist. */
export const dbMissingOnServerless = () =>
  (!!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME) && !(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_PRISMA_URL);

export function db(): Promise<Driver> {
  if (!globalThis.__nottiesDb) {
    globalThis.__nottiesDb = init().catch((e) => {
      globalThis.__nottiesDb = undefined;
      throw e;
    });
  }
  return globalThis.__nottiesDb;
}

export async function query<T extends Row = Record<string, unknown>>(text: string, params?: unknown[]) {
  return (await db()).query<T>(text, params);
}

export async function one<T extends Row = Record<string, unknown>>(text: string, params?: unknown[]) {
  const { rows } = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTx<T>(fn: (q: Q) => Promise<T>) {
  return (await db()).withTx(fn);
}

/** Thrown by game rules; the API layer turns it into a 4xx with the message shown to the player. */
export class GameError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
