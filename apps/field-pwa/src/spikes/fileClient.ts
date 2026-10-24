export class FileClient {
  private w = new Worker(new URL('./fileWorker.ts', import.meta.url), { type: 'module' });
  private seq = 0;
  private p = new Map<number, { res: (v: any) => void; rej: (e: Error) => void }>();
  constructor() { this.w.onmessage = (e) => { const x = this.p.get(e.data.id); if (!x) return; this.p.delete(e.data.id); e.data.ok ? x.res(e.data.result) : x.rej(new Error(e.data.error)); }; }
  private call<T>(m: Record<string, unknown>, transfer: Transferable[] = []) { const id = ++this.seq; return new Promise<T>((res, rej) => { this.p.set(id, { res, rej }); this.w.postMessage({ id, ...m }, transfer); }); }
  write(name: string, bytes: ArrayBuffer) { return this.call<{ sha256: string }>({ op: 'write', name, bytes }, [bytes]); }
  read(name: string) { return this.call<{ bytes: ArrayBuffer }>({ op: 'read', name }); }
  hash(name: string) { return this.call<{ sha256: string; size: number }>({ op: 'hash', name }); }
  seed(count: number, sizeMB: number) { return this.call<{ files: number; totalMB: number }>({ op: 'seed', count, sizeMB }); }
  verify() { return this.call<any>({ op: 'verify' }); }
  clear(prefix: string) { return this.call<{ removed: number }>({ op: 'clear', prefix }); }
}
export const files = new FileClient();
export async function sha256Hex(buf: ArrayBuffer) { const d = await crypto.subtle.digest('SHA-256', buf); return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
export const stamp = () => new Date().toISOString();
