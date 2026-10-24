import { useEffect, useRef, useState } from 'react';
import { files, sha256Hex, stamp } from './fileClient';
import { exifInfo } from './exif';
import { DbClient } from '../db/client';
import { probe, requestPersist } from '../probe';

// Real-device risk spikes from ADR-0003. Each panel reports facts only and has a "Copy result" button
// so the operator can paste the JSON back. Nothing here talks to the BinaField server contracts.
const box: React.CSSProperties = { border: '1px solid #ccc', borderRadius: 8, padding: 12, margin: '12px 0' };
const pre: React.CSSProperties = { background: '#f4f4f4', padding: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12 };

function useLog() {
  const [log, setLog] = useState<string[]>([]);
  return { log, add: (s: string) => setLog((l) => [...l, `${stamp().slice(11, 19)} ${s}`]), reset: () => setLog([]) };
}
async function copy(obj: unknown) {
  const text = JSON.stringify({ at: stamp(), ua: navigator.userAgent, env: await probe(), ...(obj as object) }, null, 2);
  try { await navigator.clipboard.writeText(text); } catch { /* clipboard may be blocked; text is shown below */ }
  return text;
}
function Result({ data }: { data: unknown }) {
  const [text, setText] = useState('');
  return (<div><button onClick={async () => setText(await copy(data))}>Copy result</button>{text && <pre style={pre}>{text}</pre>}</div>);
}

/* ---- Spike 1: storage durability ---- */
function Spike1() {
  const { log, add } = useLog();
  const [mb, setMb] = useState(200);
  const [verify, setVerify] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const run = async (f: () => Promise<void>) => { setBusy(true); try { await f(); } catch (e: any) { add('ERROR ' + e.message); } setBusy(false); };
  return (
    <section style={box}>
      <h3>Spike 1 — storage durability</h3>
      <p>Seed {mb} MB of random files with recorded SHA-256, install the app, leave it idle, then Verify later (7 days for the formal test).</p>
      <label>MB <input type="number" value={mb} min={10} max={1000} onChange={(e) => setMb(Number(e.target.value))} style={{ width: 80 }} /></label>{' '}
      <button disabled={busy} onClick={() => run(async () => {
        add('persist() -> ' + (await requestPersist()));
        const r = await files.seed(Math.ceil(mb / 2), 2); add(`seeded ${r.files} files, ${r.totalMB} MB`);
      })}>Seed</button>{' '}
      <button disabled={busy} onClick={() => run(async () => { const v = await files.verify(); setVerify(v); add(v.found ? `verified ${v.ok}/${v.expected}, bad ${v.bad.length}` : 'no seed found (storage may have been cleared)'); })}>Verify</button>
      <pre style={pre}>{log.join('\n') || 'idle'}</pre>
      <Result data={{ spike: 1, verify, log }} />
    </section>
  );
}

/* ---- Spike 3: captured photo bytes ---- */
function Spike3() {
  const { log, add } = useLog();
  const [res, setRes] = useState<any>(null);
  const [gps, setGps] = useState<any>(null);
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const buf = await f.arrayBuffer();
      const exif = exifInfo(buf);
      const captureHash = await sha256Hex(buf.slice(0));
      const stored = await files.write(`photo-${Date.now()}.bin`, buf.slice(0));
      const r = await fetch('/api/echo-hash', { method: 'POST', body: f });
      const server = r.ok ? await r.json() : { error: r.status };
      const out = { name: f.name, type: f.type, size: f.size, captureHash, opfsReadBackHash: stored.sha256, serverHash: server.sha256 ?? null, serverSize: server.size ?? null, ...exif,
        PASS_opfs: captureHash === stored.sha256, PASS_server: captureHash === server.sha256 };
      setRes(out); add(`opfs ${out.PASS_opfs ? 'PASS' : 'FAIL'}, server ${out.PASS_server ? 'PASS' : 'FAIL'}, exif ${exif.exif}, gpsTag ${exif.gpsTag}`);
    } catch (e: any) { add('ERROR ' + e.message); }
  };
  return (
    <section style={box}>
      <h3>Spike 3 — captured photo bytes</h3>
      <p>Take a photo with the camera. The app hashes it, stores it, reads it back and sends it to the server; all hashes must match. It also reports whether EXIF and a GPS tag survive.</p>
      <input type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e.target.files?.[0])} />{' '}
      <button onClick={() => navigator.geolocation.getCurrentPosition((p) => setGps({ lat: p.coords.latitude, lon: p.coords.longitude, accuracyM: p.coords.accuracy }), (e) => setGps({ error: e.message }), { enableHighAccuracy: true, timeout: 15000 })}>Read GPS (stored separately)</button>
      <pre style={pre}>{log.join('\n') || 'idle'}{res ? '\n' + JSON.stringify(res, null, 1) : ''}{gps ? '\nGPS ' + JSON.stringify(gps) : ''}</pre>
      <Result data={{ spike: 3, result: res, gps }} />
    </section>
  );
}

/* ---- Spike 2: background upload / outbox resume ---- */
type Item = { name: string; sha256: string; status: 'PENDING' | 'UPLOADED' | 'FAILED' };
const KEY = 'bf-spike2-outbox';
const load = (): Item[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } };
const save = (x: Item[]) => { try { localStorage.setItem(KEY, JSON.stringify(x)); } catch { /* ignore */ } };
function Spike2() {
  const { log, add } = useLog();
  const [items, setItems] = useState<Item[]>(load());
  const draining = useRef(false);
  const drain = async () => {
    if (draining.current) return; draining.current = true;
    try {
      let cur = load();
      for (const it of cur.filter((i) => i.status !== 'UPLOADED')) {
        const b = (await files.read(it.name)).bytes;
        const r = await fetch('/api/echo-hash', { method: 'POST', body: b });
        const j = r.ok ? await r.json() : null;
        cur = load().map((x) => (x.name === it.name ? { ...x, status: j?.sha256 === it.sha256 ? 'UPLOADED' : 'FAILED' } : x));
        save(cur); setItems(cur); add(`${it.name} -> ${cur.find((x) => x.name === it.name)?.status}`);
        await new Promise((r2) => setTimeout(r2, 1500)); // slow on purpose so you can close the app mid-run
      }
    } catch (e: any) { add('drain stopped: ' + e.message); } finally { draining.current = false; }
  };
  useEffect(() => { // automatic resume on open, on regaining network and on becoming visible
    const kick = () => { if (load().some((i) => i.status !== 'UPLOADED')) { add('auto-resume'); drain(); } };
    kick(); window.addEventListener('online', kick); document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
    return () => window.removeEventListener('online', kick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const queue = async () => {
    await files.clear('outbox-');
    const next: Item[] = [];
    for (let i = 0; i < 10; i++) {
      const b = new Uint8Array(1048576); for (let o = 0; o < b.length; o += 65536) crypto.getRandomValues(b.subarray(o, o + 65536));
      const name = `outbox-${i}.bin`; await files.write(name, b.buffer.slice(0)); next.push({ name, sha256: await sha256Hex(b.buffer), status: 'PENDING' });
    }
    save(next); setItems(next); add('queued 10 x 1 MB');
  };
  const syncApi = 'SyncManager' in window;
  return (
    <section style={box}>
      <h3>Spike 2 — background upload and outbox resume</h3>
      <p>Queue 10 files, tap Start upload, then close the app (or swipe it away) after 2–3 files. Reopen: the rest must upload by themselves, nothing lost, pending items visible. Background Sync API: <strong>{String(syncApi)}</strong>.</p>
      <button onClick={queue}>Queue 10 files</button> <button onClick={drain}>Start upload</button>
      <pre style={pre}>{items.map((i) => `${i.status.padEnd(8)} ${i.name}`).join('\n') || 'empty'}{'\n\n'}{log.join('\n')}</pre>
      <Result data={{ spike: 2, backgroundSyncApi: syncApi, items, log }} />
    </section>
  );
}

/* ---- Spike 4: crash safety ---- */
function Spike4() {
  const { log, add } = useLog();
  const [out, setOut] = useState<any>(null);
  const stop = useRef(false);
  const open = async () => { const db = new DbClient(); await db.open('spike4.db'); await db.exec('CREATE TABLE IF NOT EXISTS s4(batch INTEGER NOT NULL, k INTEGER NOT NULL, pad TEXT NOT NULL, PRIMARY KEY(batch,k));'); return db; };
  const write = async () => {
    stop.current = false; const db = await open();
    const start = ((await db.exec<{ m: number | null }>('SELECT max(batch) m FROM s4'))[0]?.m ?? -1) + 1;
    add('writing from batch ' + start + ' — now force-quit the app (swipe it away)');
    for (let b = start; !stop.current; b++) {
      await db.exec('BEGIN');
      for (let k = 0; k < 50; k++) await db.exec('INSERT INTO s4 VALUES (?,?,?)', [b, k, 'x'.repeat(2000)]);
      await db.exec('COMMIT');
      if (b % 20 === 0) add('committed batch ' + b);
    }
    await db.close();
  };
  const check = async () => {
    const db = await open();
    const integrity = (await db.exec<{ integrity_check: string }>('PRAGMA integrity_check'))[0]?.integrity_check;
    const partial = await db.exec('SELECT batch, count(*) n FROM s4 GROUP BY batch HAVING n <> 50');
    const total = (await db.exec<{ n: number }>('SELECT count(*) n FROM s4'))[0]?.n;
    const r = { integrity, batchesWithWrongRowCount: partial, totalRows: total, PASS: integrity === 'ok' && partial.length === 0 };
    setOut(r); add(`integrity ${integrity}, partial batches ${partial.length}, ${r.PASS ? 'PASS' : 'FAIL'}`); await db.close();
  };
  return (
    <section style={box}>
      <h3>Spike 4 — crash safety</h3>
      <p>Tap Start writing, wait for a few "committed" lines, then force-quit the app mid-write. Reopen, tap Check database, then run the six gate checks above. Repeat 3 times.</p>
      <button onClick={() => write().catch((e) => add('ERROR ' + e.message))}>Start writing</button>{' '}
      <button onClick={() => { stop.current = true; }}>Stop</button>{' '}
      <button onClick={() => check().catch((e) => add('ERROR ' + e.message))}>Check database</button>
      <pre style={pre}>{log.slice(-12).join('\n') || 'idle'}</pre>
      <Result data={{ spike: 4, check: out }} />
    </section>
  );
}

export default function Spikes() {
  return (<div><h2 style={{ fontSize: 18 }}>Risk spikes (ADR-0003)</h2><Spike1 /><Spike2 /><Spike3 /><Spike4 /></div>);
}
