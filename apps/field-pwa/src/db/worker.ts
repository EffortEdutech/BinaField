/// <reference lib="webworker" />
// SQLite WASM in a dedicated worker. Persistent mode uses the OPFS "SAH pool" VFS, which needs no
// SharedArrayBuffer / COOP-COEP headers (works on Vercel static hosting and Safari 16.4+).
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

type Req = { id: number; op: 'open' | 'exec' | 'close'; path?: string | null; fresh?: boolean; sql?: string; bind?: unknown[] };
let db: any = null;
let poolUtil: any = null;
let sqlite3: any = null;

async function ensureModule() {
  if (!sqlite3) sqlite3 = await (sqlite3InitModule as any)();
  return sqlite3;
}

async function handle(r: Req) {
  const s = await ensureModule();
  if (r.op === 'open') {
    if (db) { db.close(); db = null; }
    if (r.path) {
      if (!poolUtil) poolUtil = await s.installOpfsSAHPoolVfs({ name: 'binafield-sahpool', clearOnInit: false });
      if (r.fresh) await poolUtil.unlink(r.path);
      db = new poolUtil.OpfsSAHPoolDb(r.path);
    } else {
      db = new s.oo1.DB(':memory:', 'c');
    }
    db.exec('PRAGMA foreign_keys = ON;');
    return { version: s.version.libVersion, persistent: !!r.path };
  }
  if (r.op === 'exec') {
    if (!db) throw new Error('DB_NOT_OPEN');
    const rows: unknown[] = [];
    db.exec({ sql: r.sql, bind: r.bind, rowMode: 'object', resultRows: rows });
    return rows;
  }
  if (r.op === 'close') {
    if (db) { db.close(); db = null; }
    return true;
  }
  throw new Error('UNKNOWN_OP');
}

self.onmessage = async (e: MessageEvent<Req>) => {
  try {
    (self as any).postMessage({ id: e.data.id, ok: true, result: await handle(e.data) });
  } catch (err: any) {
    (self as any).postMessage({ id: e.data.id, ok: false, error: String(err?.message ?? err) });
  }
};
