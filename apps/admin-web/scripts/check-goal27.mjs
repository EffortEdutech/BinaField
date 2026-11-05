import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'src/SupervisorDashboardV2.tsx'), 'utf8');
const main = await readFile(resolve(root, 'src/main.tsx'), 'utf8');
const auth = await readFile(resolve(root, 'src/auth.ts'), 'utf8');
const css = await readFile(resolve(root, 'src/workspace.css'), 'utf8');
const styles = await readFile(resolve(root, 'src/styles.css'), 'utf8');

const legacyFiles = ['src/AdminStudio.tsx', 'src/App.tsx', 'src/SupervisorDashboard.tsx'];
const legacyPresent = [];
for (const file of legacyFiles) {
  try { await access(resolve(root, file)); legacyPresent.push(file); } catch {}
}

const checks = [
  ['current entry uses administrator workspace', /SupervisorDashboardV2/.test(main) && /export default function SupervisorDashboardV2/.test(source)],
  ['email and password identity', /type="email"/.test(source) && /type="password"/.test(source) && /autoComplete="username"/.test(source) && /Signed in as/.test(source)],
  ['session restore and refresh', /loadSession\(\)/.test(source) && /refreshSession/.test(source) && /expiresAt/.test(source)],
  ['organisation discovery and context', /\/organizations/.test(source) && /aria-label="Organisation"/.test(source) && /organisation/.test(source)],
  ['people invitations roles and permissions', /inviteMember/.test(source) && /assignRole/.test(source) && /permissions/.test(source) && /Memberships/.test(source)],
  ['device registration and lifecycle', /devices/.test(source) && /ACTIVATE|SUSPEND|REVOKE/.test(source) && /Device/.test(source)],
  ['projects and report templates', /createProject/.test(source) && /createTemplate/.test(source) && /Report templates/.test(source)],
  ['named assignment issuance', /issueAssignment/.test(source) && /Field worker/.test(source) && /Assignment project/.test(source)],
  ['review decisions and audit', /bulkReview/.test(source) && /review\(/.test(source) && /Recent audit events/.test(source)],
  ['report exports and print', /Download JSON/.test(source) && /Download CSV/.test(source) && /Print \/ Save PDF/.test(source) && /window\.print/.test(source)],
  ['responsive and accessible styling', /@media\(max-width:720px\)/.test(css) && /@media print/.test(css) && /focus-visible/.test(styles) && /aria-label/.test(source)],
  ['technical controls hidden from normal UI', !/aria-label="Bearer token"/.test(source) && !/aria-label="Organisation ID"/.test(source) && !/placeholder=".*token/i.test(source) && !/placeholder=".*UUID/i.test(source)],
  ['legacy technical UI removed', legacyPresent.length === 0],
  ['auth client keeps credentials internal', /grant_type=password/.test(auth) && /refresh_token/.test(auth) && /localStorage\.setItem\(KEY/.test(auth) && !/localStorage\.setItem\([^,]+,\s*token/.test(source)],
];

const result = { pass: checks.every(([, pass]) => pass), checks: checks.map(([name, pass]) => ({ name, pass })), legacy_present: legacyPresent };
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
