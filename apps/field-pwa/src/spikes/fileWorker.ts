/// <reference lib="webworker" />
// OPFS file IO in a worker (createSyncAccessHandle works in every browser we target, incl. Safari).
type Req =
  | { id: number; op: 'write'; name: string; bytes: ArrayBuffer }
  | { id: number; op: 'read'; name: string }
  | { id: number; op: 'hash'; name: string }
  | { id: number; op: 'seed'; count: number; sizeMB: number }
  | { id: number; op: 'verify' }
  | { id: number; op: 'clear'; prefix: string };

const DIR = 'spikes';
async function dir() { const root = await navigator.storage.getDirectory(); return root.getDirectoryHandle(DIR, { create: true }); }
async function writeFile(name: string, bytes: ArrayBuffer | Uint8Array) {
  const d = await dir(); const fh = await d.getFileHandle(name, { create: true });
  const h = await (fh as any).createSyncAccessHandle();
  try { h.truncate(0); const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes); h.write(view, { at: 0 }); h.flush(); } finally { h.close(); }
}
async function readFile(name: string): Promise<Uint8Array> {
  const d = await dir(); const fh = await d.getFileHandle(name);
  const h = await (fh as any).createSyncAccessHandle();
  try { const out = new Uint8Array(h.getSize()); h.read(out, { at: 0 }); return out; } finally { h.close(); }
}
async function sha(bytes: Uint8Array) {
  const d = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function random(size: number) { const out = new Uint8Array(size); for (let i = 0; i < size; i += 65536) crypto.getRandomValues(out.subarray(i, Math.min(i + 65536, size))); return out; }

async function handle(r: Req): Promise<unknown> {
  if (r.op === 'write') { await writeFile(r.name, r.bytes); return { sha256: await sha(await readFile(r.name)) }; }
  if (r.op === 'read') { const b = await readFile(r.name); return { bytes: b.buffer }; }
  if (r.op === 'hash') { const b = await readFile(r.name); return { sha256: await sha(b), size: b.byteLength }; }
  if (r.op === 'seed') {
    const items: { name: string; sha256: string; size: number }[] = [];
    for (let i = 0; i < r.count; i++) {
      const b = random(r.sizeMB * 1048576); const name = `seed-${String(i).padStart(3, '0')}.bin`;
      await writeFile(name, b); items.push({ name, sha256: await sha(b), size: b.byteLength });
    }
    await writeFile('seed-manifest.json', new TextEncoder().encode(JSON.stringify({ createdAt: new Date().toISOString(), items })));
    return { files: items.length, totalMB: items.reduce((a, x) => a + x.size, 0) / 1048576 };
  }
  if (r.op === 'verify') {
    let manifest: { createdAt: string; items: { name: string; sha256: string; size: number }[] };
    try { manifest = JSON.parse(new TextDecoder().decode(await readFile('seed-manifest.json'))); } catch { return { found: false }; }
    let ok = 0; const bad: string[] = [];
    for (const it of manifest.items) {
      try { const b = await readFile(it.name); (await sha(b)) === it.sha256 && b.byteLength === it.size ? ok++ : bad.push(it.name + ' (hash/size differ)'); }
      catch { bad.push(it.name + ' (missing)'); }
    }
    return { found: true, createdAt: manifest.createdAt, expected: manifest.items.length, ok, bad };
  }
  if (r.op === 'clear') {
    const d = await dir(); const names: string[] = [];
    for await (const [n] of (d as any).entries()) if (n.startsWith(r.prefix)) names.push(n);
    for (const n of names) await d.removeEntry(n);
    return { removed: names.length };
  }
  throw new Error('UNKNOWN_OP');
}
self.onmessage = async (e: MessageEvent<Req>) => {
  try { const result: any = await handle(e.data); (self as any).postMessage({ id: e.data.id, ok: true, result }, result?.bytes ? [result.bytes] : []); }
  catch (err: any) { (self as any).postMessage({ id: e.data.id, ok: false, error: String(err?.message ?? err) }); }
};
