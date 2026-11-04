import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const ui = await readFile(resolve(root, 'src/SupervisorDashboardV2.tsx'), 'utf8');
const css = await readFile(resolve(root, 'src/workspace.css'), 'utf8');
const checks = [
  ['reference identity block', /report-identity/.test(ui)],
  ['daily activity section', /Daily Field Activity Log/.test(ui)],
  ['harvest section', /Produce &amp; Yield Harvest Record/.test(ui)],
  ['resource audit section', /Resource &amp; Input Audit/.test(ui)],
  ['notes and signatures', /report-notes[\s\S]*report-signatures/.test(ui)],
  ['provenance disclosure', /report-provenance/.test(ui)],
  ['JSON and CSV downloads', /Download JSON[\s\S]*Download CSV/.test(ui)],
  ['print / PDF action', ui.includes('Print / Save PDF') && css.includes('@media print')],
  ['responsive report rules', /report-identity,.report-signatures,.report-kpis/.test(css)],
  ['photo preview endpoint available', ui.includes('request-download') || ui.includes('downloadMedia') || ui.includes('<img')],
];
const pass = checks.every(([, ok]) => ok);
console.log(JSON.stringify({ pass, checks: checks.map(([name, ok]) => ({ name, pass: ok })) }, null, 2));
if (!pass) process.exitCode = 1;
