import { useEffect, useState } from 'react';
import { probe, requestPersist, type Probe } from './probe';
import { runGate, type GateResult } from './gate/runGate';

declare global { interface Window { __bf?: { runGate: typeof runGate } } }
window.__bf = { runGate };

export default function App() {
  const [env, setEnv] = useState<Probe>({});
  const [results, setResults] = useState<GateResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => probe().then(setEnv);
  useEffect(() => { refresh(); }, []);

  const doGate = async () => { setBusy(true); setResults(await runGate()); setBusy(false); refresh(); };
  const doPersist = async () => { const ok = await requestPersist(); setEnv({ ...env, 'persist() result': String(ok) }); refresh(); };
  const allPass = results?.every((r) => r.pass);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 720, margin: '0 auto', padding: '16px' }}>
      <h1 style={{ fontSize: 22 }}>BinaField Field — PWA spike</h1>
      <p>Build <code>0.7.0-pwa-spike</code>. Runs the six local-store gate checks in this browser (ADR-0001).</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        <button data-testid="run-gate" onClick={doGate} disabled={busy}>{busy ? 'Running…' : 'Run gate checks G1–G6'}</button>
        <button onClick={doPersist}>Request persistent storage</button>
      </div>
      {results && (
        <section data-testid="gate-results" data-all-pass={String(!!allPass)}>
          <h2 style={{ fontSize: 18 }}>{allPass ? 'All 6 passed' : 'Failures present'}</h2>
          <ul style={{ paddingLeft: 18 }}>
            {results.map((r) => (
              <li key={r.id} data-testid={`gate-${r.id}`} data-pass={String(r.pass)}>
                <strong>{r.pass ? 'PASS' : 'FAIL'}</strong> {r.id} — {r.name}<br /><small>{r.detail}</small>
              </li>
            ))}
          </ul>
        </section>
      )}
      <h2 style={{ fontSize: 18 }}>This device</h2>
      <table><tbody>{Object.entries(env).map(([k, v]) => (<tr key={k}><td style={{ paddingRight: 12 }}>{k}</td><td style={{ wordBreak: 'break-all' }}>{v}</td></tr>))}</tbody></table>
    </main>
  );
}
