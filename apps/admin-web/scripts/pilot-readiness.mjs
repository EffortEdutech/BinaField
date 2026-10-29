import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const checks = [];
async function url(name, target, expected = 200) {
  try {
    const r = await fetch(target, { redirect: 'manual' });
    checks.push({ name, pass: r.status === expected, status: r.status, target });
  } catch (e) { checks.push({ name, pass: false, target, error: String(e) }); }
}
async function file(name, target) {
  try { await access(target); checks.push({ name, pass: true, target }); }
  catch { checks.push({ name, pass: false, target }); }
}
await url('API health', process.env.BINAFIELD_API_HEALTH ?? 'https://binafield-api.vercel.app/api/health');
await url('Admin Studio deployment', process.env.BINAFIELD_ADMIN_URL ?? 'https://binafield-admin-studio.vercel.app');
await url('Field PWA deployment', process.env.BINAFIELD_PWA_URL ?? 'https://bina-field.vercel.app');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
for (const name of ['PILOT-READINESS-CHECKLIST.md', 'DEPLOYMENT-ENVIRONMENT-ROLLBACK.md', 'SUPPORT-MONITORING-RUNBOOK.md', 'KNOWN-LIMITATIONS.md', 'PILOT-OWNER-SIGNOFF.md']) await file(`pilot document: ${name}`, resolve(root, 'docs', 'pilot', name));
const result = { pass: checks.every(x => x.pass), checks };
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
