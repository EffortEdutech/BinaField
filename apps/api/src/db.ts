import { Pool } from 'pg';

// Minimal database seam so handlers can be tested without a database.
export interface Queryable { query<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<{ rows: T[] }> }
export interface Db {
  /** Runs fn in one transaction as the restricted runtime role. Commits on success, rolls back on error. */
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  /** Reachability check. `reason` is only a coarse error code (for example 28P01 or ENOTFOUND), never a message or secret. */
  ping(): Promise<{ ok: boolean; reason?: string }>;
}

/** Real implementation over a pg Pool. The connection string comes from the environment only. */
export function createPgDb(connectionString: string): Db {
  const pool = new Pool({ connectionString, max: 3, idleTimeoutMillis: 10_000, ssl: { rejectUnauthorized: false } });
  return {
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SET LOCAL ROLE app_runtime'); // needs GRANT app_runtime TO postgres WITH SET TRUE (ADR-0004)
        const out = await fn(client as unknown as Queryable);
        await client.query('COMMIT');
        return out;
      } catch (e) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw e;
      } finally { client.release(); }
    },
    async ping() {
      try { await pool.query('SELECT 1'); return { ok: true }; }
      catch (e) { const c = (e as { code?: unknown }).code; return { ok: false, reason: typeof c === 'string' && /^[A-Z0-9_]{3,16}$/.test(c) ? c : 'UNKNOWN' }; }
    }
  };
}
