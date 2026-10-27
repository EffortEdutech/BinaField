import { useCallback, useEffect, useRef, useState } from 'react';
import { loadSettings, saveSettings, type Settings } from './config';
import { login, logout, hasSession } from './auth';
import { pull, listAssignments } from './sync';
import { listOutbox, runOutbox } from './outbox';
import { addPhoto, blueprintFor, listPhotos, missingFields, openDraft, removePhoto, saveDraft, submit, type Blueprint } from './submit';
import { q } from './store';

type Row = Record<string, any>;
const box: React.CSSProperties = { border: '1px solid #ccc', borderRadius: 8, padding: 12, margin: '12px 0' };
const btn: React.CSSProperties = { padding: '10px 14px', fontSize: 16, marginRight: 8, marginTop: 6 };

export default function FieldApp() {
  const [set, setSet] = useState<Settings>(loadSettings());
  const [signedIn, setSignedIn] = useState(hasSession());
  const [online, setOnline] = useState(navigator.onLine);
  const [msg, setMsg] = useState('');
  const [assignments, setAssignments] = useState<Row[]>([]);
  const [outbox, setOutbox] = useState<Row[]>([]);
  const [cases, setCases] = useState<Row[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [email, setEmail] = useState(''); const [pw, setPw] = useState('');

  const refresh = useCallback(async () => {
    setAssignments(await listAssignments()); setOutbox(await listOutbox());
    setCases(await q("SELECT case_id, conflict_type, entity_id, status FROM reconciliation_case WHERE status IN ('OPEN','AWAITING_USER') ORDER BY created_at DESC"));
  }, []);
  const syncNow = useCallback(async () => {
    if (!hasSession()) return;
    const p = await pull(set); const o = await runOutbox(set);
    setMsg(p.ok ? `Synced. Sent ${o.succeeded}${o.failed ? `, ${o.failed} failed` : ''}${o.offline ? ', offline — will retry' : ''}.` : `Pull: ${p.reason}`);
    await refresh();
  }, [set, refresh]);
  const flush = useCallback(async () => { if (hasSession()) { await runOutbox(set); await refresh(); } }, [set, refresh]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const on = () => { setOnline(true); void syncNow(); }, off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    const t = setInterval(() => { if (navigator.onLine) void flush(); }, 15000);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); clearInterval(t); };
  }, [syncNow, flush]);

  const doLogin = async () => { try { await login(set, email, pw); setSignedIn(true); setPw(''); setMsg('Signed in'); void syncNow(); } catch (e: any) { setMsg(`Sign-in failed: ${e.message}`); } };
  const pending = outbox.filter((o) => !['SUCCEEDED', 'FAILED_FINAL', 'CANCELLED_BY_POLICY'].includes(o.state)).length;

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <h1 style={{ fontSize: 22 }}>BinaField Field</h1>
      <p data-testid="status">{online ? 'Online' : 'Offline'} · <span data-testid="pending">{pending}</span> waiting to send {msg && <>· <span data-testid="msg">{msg}</span></>}</p>
      <button style={btn} onClick={() => setShowSettings((v) => !v)}>Settings</button>
      {showSettings && (
        <section style={box}>
          {(['apiBase', 'supabaseUrl', 'anonKey', 'organizationId', 'deviceId'] as const).map((k) => (
            <label key={k} style={{ display: 'block', marginBottom: 6 }}>{k}<input style={{ width: '100%', fontSize: 14 }} value={set[k]} onChange={(e) => setSet({ ...set, [k]: e.target.value })} /></label>
          ))}
          <button style={btn} onClick={() => { saveSettings(set); setMsg('Settings saved'); }}>Save</button>
        </section>
      )}
      {!signedIn ? (
        <section style={box}>
          <h2 style={{ fontSize: 18 }}>Sign in</h2>
          <input data-testid="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ display: 'block', width: '100%', fontSize: 16, marginBottom: 8 }} />
          <input data-testid="password" type="password" placeholder="password" value={pw} onChange={(e) => setPw(e.target.value)} style={{ display: 'block', width: '100%', fontSize: 16, marginBottom: 8 }} />
          <button data-testid="login" style={btn} onClick={doLogin}>Sign in</button>
        </section>
      ) : (
        <>
          <button data-testid="sync" style={btn} onClick={syncNow}>Sync now</button>
          <button style={btn} onClick={() => { logout(); setSignedIn(false); }}>Sign out</button>
          {cases.length > 0 && (
            <section style={{ ...box, borderColor: '#c00' }} data-testid="cases">
              <h2 style={{ fontSize: 18 }}>Needs your attention ({cases.length})</h2>
              {cases.map((c) => <p key={c.case_id}><strong>{c.conflict_type}</strong><br /><small>{c.entity_id}</small></p>)}
            </section>
          )}
          <h2 style={{ fontSize: 18 }}>Assignments</h2>
          {assignments.length === 0 && <p data-testid="no-assignments">None yet. Press Sync now while online.</p>}
          {assignments.map((a) => (
            <section key={a.assignment_id} style={box} data-testid="assignment">
              <strong>{JSON.parse(a.subject_json).name ?? a.assignment_id.slice(0, 8)}</strong> · rev {a.authoritative_revision}<br />
              <small data-testid="exec-status">{a.local_execution_status}</small><br />
              {a.local_execution_status === 'NOT_STARTED' || a.local_execution_status === 'IN_PROGRESS'
                ? <button data-testid="open-form" style={btn} onClick={() => setOpen(open === a.assignment_id ? null : a.assignment_id)}>{open === a.assignment_id ? 'Close' : 'Fill in'}</button> : null}
              {open === a.assignment_id && <Form set={set} assignment={a} onDone={async () => { setOpen(null); await refresh(); void flush(); }} />}
            </section>
          ))}
          <h2 style={{ fontSize: 18 }}>Sending</h2>
          <ul data-testid="outbox" style={{ paddingLeft: 18, fontSize: 14 }}>
            {outbox.map((o) => <li key={o.operation_id} data-state={o.state} data-type={o.operation_type}>{o.operation_type} · {o.state}{o.last_error_code ? ` · ${o.last_error_code}` : ''}</li>)}
          </ul>
        </>
      )}
    </main>
  );
}

function Form({ set, assignment, onDone }: { set: Settings; assignment: Row; onDone: () => void }) {
  const [bp, setBp] = useState<Blueprint | null>(null);
  const [sid, setSid] = useState('');
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [photos, setPhotos] = useState<Row[]>([]);
  const [err, setErr] = useState('');
  const file = useRef<HTMLInputElement>(null); const photoField = useRef('');

  useEffect(() => { (async () => {
    const b = await blueprintFor(assignment.template_version_id); setBp(b?.bp ?? null);
    const d = await openDraft(set, assignment.assignment_id); setSid(d.session.session_id); setPayload(d.payload);
    setPhotos(await listPhotos(d.session.session_id));
  })(); }, [assignment.assignment_id, assignment.template_version_id, set]);

  const change = (id: string, v: unknown) => { const n = { ...payload, [id]: v }; setPayload(n); void saveDraft(set, sid, n); };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    await addPhoto(set, sid, assignment.assignment_id, photoField.current, f); setPhotos(await listPhotos(sid)); e.target.value = '';
  };
  const send = async () => {
    const r = await submit(set, sid);
    if (r.missing.length) setErr(`Still needed: ${r.missing.join(', ')}`); else onDone();
  };
  if (!sid) return <p>Opening…</p>;
  if (!bp) return <p>The form for this assignment is not on this phone yet. Sync while online.</p>;
  const miss = missingFields(bp, payload, photos.map((p) => p.field_id));
  return (
    <div data-testid="form">
      <h3>{bp.title}</h3>
      <input ref={file} type="file" accept="image/*" capture="environment" data-testid="file" style={{ display: 'none' }} onChange={onFile} />
      {bp.fields.map((f) => (
        <div key={f.id} style={{ margin: '10px 0' }}>
          <label>{f.label}{f.required ? ' *' : ''}</label><br />
          {f.type === 'select' && <select data-testid={`f-${f.id}`} value={String(payload[f.id] ?? '')} onChange={(e) => change(f.id, e.target.value)} style={{ fontSize: 16 }}><option value="">—</option>{f.options?.map((o) => <option key={o}>{o}</option>)}</select>}
          {f.type === 'text' && <textarea data-testid={`f-${f.id}`} value={String(payload[f.id] ?? '')} onChange={(e) => change(f.id, e.target.value)} style={{ width: '100%', fontSize: 16 }} />}
          {f.type === 'photo' && <>
            <button style={btn} data-testid={`add-${f.id}`} onClick={() => { photoField.current = f.id; file.current?.click(); }}>Take / choose photo</button>
            {photos.filter((p) => p.field_id === f.id).map((p) => <span key={p.attachment_id} data-testid="photo" style={{ marginRight: 8 }}>{(p.byte_size / 1024).toFixed(0)} KB <button onClick={async () => { await removePhoto(p.attachment_id); setPhotos(await listPhotos(sid)); }}>x</button></span>)}
          </>}
        </div>
      ))}
      {err && <p style={{ color: '#c00' }} data-testid="form-error">{err}</p>}
      <button data-testid="submit" style={btn} disabled={miss.length > 0} onClick={send}>Submit</button>
    </div>
  );
}
