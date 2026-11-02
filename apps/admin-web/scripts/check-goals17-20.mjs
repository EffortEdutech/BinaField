import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dashboard = await readFile(resolve(root, 'src/SupervisorDashboardV2.tsx'), 'utf8');
const workspace = await readFile(resolve(root, 'src/workspace.css'), 'utf8');
const styles = await readFile(resolve(root, 'src/styles.css'), 'utf8');

const checks = [
  ['assignment search and filtering', /Search assignments[\s\S]*Filter assignment state/.test(dashboard)],
  ['submission timeline and truthful empty state', /Submission timeline[\s\S]*No submission events yet/.test(dashboard)],
  ['review queue actions', /Accept[\s\S]*Reject/.test(dashboard)],
  ['report reconciliation and freshness', /Reconciled total[\s\S]*Data freshness/.test(dashboard)],
  ['JSON and CSV exports', /exportData\("assignments", "json"\)[\s\S]*exportData\("submissions", "csv"\)/.test(dashboard)],
  ['organisation administration sections', /Projects[\s\S]*Memberships (?:and|&) roles[\s\S]*Devices[\s\S]*Deployments/.test(dashboard)],
  ['semantic labels and live status', /aria-label="Search assignments"/.test(dashboard) && /role="status"/.test(dashboard)],
  ['responsive workspace rules', /@media\(max-width:720px\)/.test(workspace) && /@media\(max-width:720px\)/.test(styles)],
  ['keyboard focus styling', /focus-visible/.test(styles),],
  ['print styling/action', /window\.print|print/.test(dashboard + workspace)],
  ['normal admin login without token field', /type="email"[\s\S]*autoComplete="username"/.test(dashboard) && /Sign in/.test(dashboard) && !/aria-label="Bearer token"/.test(dashboard)],
  ['authenticated organisation selection', /fetch\(`\$\{API\}\/organizations`/.test(dashboard) && /aria-label="Organisation"/.test(dashboard) && !/aria-label="Organisation ID"/.test(dashboard)],
];

const result = { pass: checks.every(([, pass]) => pass), checks: checks.map(([name, pass]) => ({ name, pass })) };
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
