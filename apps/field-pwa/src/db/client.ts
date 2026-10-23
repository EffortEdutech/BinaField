// Thin promise client over the SQLite worker. One client = one worker = one open database.
export class DbClient {
  private worker: Worker;
  private seq = 0;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();

  constructor() {
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e) => {
      const p = this.pending.get(e.data.id);
      if (!p) return;
      this.pending.delete(e.data.id);
      e.data.ok ? p.resolve(e.data.result) : p.reject(new Error(e.data.error));
    };
  }

  private call<T>(msg: Record<string, unknown>): Promise<T> {
    const id = ++this.seq;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, ...msg });
    });
  }

  /** path = OPFS file name for a durable DB, or null for in-memory. fresh = start from an empty file. */
  async open(path: string | null, fresh = false) {
    // A just-terminated worker may still hold the OPFS lock for a moment: retry briefly.
    for (let i = 0; ; i++) {
      try { return await this.call<{ version: string; persistent: boolean }>({ op: 'open', path, fresh }); }
      catch (e) { if (i >= 20) throw e; await new Promise((r) => setTimeout(r, 150)); }
    }
  }
  exec<T = Record<string, unknown>>(sql: string, bind?: unknown[]) { return this.call<T[]>({ op: 'exec', sql, bind }); }
  async close() { await this.call({ op: 'close' }).catch(() => undefined); this.worker.terminate(); }
}
