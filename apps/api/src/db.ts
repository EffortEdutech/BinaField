import { Pool } from 'pg';

// Minimal database seam so handlers can be tested without a database.
export interface Queryable { query<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<{ rows: T[] }> }
export interface Db {
  /** Runs fn in one transaction as the restricted runtime role. Commits on success, rolls back on error. */
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  ping(): Promise<boolean>;
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
    async ping() { try { await pool.query('SELECT 1'); return true; } catch { return false; } }
  };
}
