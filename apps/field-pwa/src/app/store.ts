import { DbClient } from '../db/client';
import { schemaSql } from '../gate/schema';

/** The app's single local database (the frozen BF-P1-07 schema) in OPFS. All access is serialised so a transaction never interleaves with another call. */
export interface Tx { exec<T = Record<string, any>>(sql: string, bind?: unknown[]): Promise<T[]> }
const DB_FILE = '/binafield-app.sqlite3';

let client: DbClient | null = null;
let ready: Promise<void> | null = null;
let chain: Promise<unknown> = Promise.resolve();

function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.catch(() => undefined);
  return next;
}

export function openStore(path: string | null = DB_FILE): Promise<void> {
  if (!ready) ready = (async () => {
    client = new DbClient();
    await client.open(path);
    const t = await client.exec<{ n: number }>("SELECT count(*) n FROM sqlite_master WHERE type='table' AND name='local_meta'");
    if (t[0]!.n === 0) {
      await client.exec(schemaSql);
      await client.exec("INSERT INTO local_meta(id,local_schema_version,runtime_version,sync_protocol_min,sync_protocol_max,client_instance_id,created_at) VALUES (1,1,'0.8.0','1.0','1.0',?,?)", [crypto.randomUUID(), new Date().toISOString()]);
    }
  })();
  return ready;
}

export async function q<T = Record<string, any>>(sql: string, bind?: unknown[]): Promise<T[]> {
  await openStore();
  return serial(() => client!.exec<T>(sql, bind));
}

/** Runs fn inside BEGIN/COMMIT; any throw rolls the whole unit back. */
export async function tx<T>(fn: (t: Tx) => Promise<T>): Promise<T> {
  await openStore();
  return serial(async () => {
    const c = client!;
    await c.exec('BEGIN IMMEDIATE');
    try { const r = await fn({ exec: (sql, bind) => c.exec(sql, bind) as any }); await c.exec('COMMIT'); return r; }
    catch (e) { await c.exec('ROLLBACK').catch(() => undefined); throw e; }
  });
}
export const now = () => new Date().toISOString();
