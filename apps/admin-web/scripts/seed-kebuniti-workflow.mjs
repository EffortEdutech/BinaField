import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const supabaseUrl = process.env.BINAField_SUPABASE_URL ?? 'https://plpaixewllldutjrjljg.supabase.co';
const anonKey = process.env.BINAField_ANON_KEY ?? 'sb_publishable_nwgPId71eV6WnxgZ91NtiA_N6VjGuKQ';
const api = process.env.BINAField_API ?? 'https://binafield-api.vercel.app/api';
const email = process.env.BINAField_EMAIL;
const password = process.env.BF_PASSWORD;
const projectId = process.env.BINAFIELD_PROJECT ?? 'a0000000-0000-4000-8000-000000000010';
const assigneeId = process.env.BINAFIELD_ASSIGNEE ?? 'a0000000-0000-4000-8000-000000000003';
const blueprintPath = resolve(import.meta.dirname, '../../../packages/test-fixtures/phase1-gate/vs01/kebuniti-field-data-blueprint.json');

if (!email || !password) throw new Error('Set BINAField_EMAIL and BF_PASSWORD in the local shell; secrets are never printed.');
async function request(url, options = {}) {
  const response = await fetch(url, options);
  let body = null; try { body = await response.json(); } catch { /* empty */ }
  if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${url.replace(api, '')} -> ${response.status} ${body?.code ?? ''} ${body?.detail ?? ''}`);
  return body;
}
const session = await request(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: anonKey, 'content-type': 'application/json' }, body: JSON.stringify({ email, password }),
});
const auth = { authorization: `Bearer ${session.access_token}` };
const organisations = await request(`${api}/organizations`, { headers: auth });
const organisation = organisations.items?.[0];
if (!organisation) throw new Error('No active organisation membership found');
const headers = (key, json = false) => ({ ...auth, ...(json ? { 'content-type': 'application/json' } : {}), 'idempotency-key': `${key}-${crypto.randomUUID()}` });
const blueprint = JSON.parse(await readFile(blueprintPath, 'utf8'));
const template = await request(`${api}/organizations/${organisation.id}/templates`, { method: 'POST', headers: headers('kebuniti-template', true), body: JSON.stringify({ template_key: `kebuniti-field-data-log-${Date.now()}`, name: 'Kebuniti Field Data Log' }) });
const version = await request(`${api}/organizations/${organisation.id}/templates/${template.id}/versions`, { method: 'POST', headers: headers('kebuniti-version', true), body: JSON.stringify({ blueprint_json: blueprint }) });
await request(`${api}/organizations/${organisation.id}/template-versions/${version.id}:validate`, { method: 'POST', headers: auth });
const published = await request(`${api}/organizations/${organisation.id}/template-versions/${version.id}:publish`, { method: 'POST', headers: headers('kebuniti-publish', true) });
const deployment = await request(`${api}/organizations/${organisation.id}/deployments`, { method: 'POST', headers: headers('kebuniti-deployment', true), body: JSON.stringify({ project_id: projectId, template_version_id: version.id, name: 'Kebuniti Field Data Log deployment' }) });
const assignment = await request(`${api}/organizations/${organisation.id}/assignments`, { method: 'POST', headers: headers('kebuniti-assignment', true), body: JSON.stringify({ project_id: projectId, deployment_id: deployment.id, template_version_id: version.id, assignee_membership_id: assigneeId, operational_subject_ref: { label: 'Kebuniti field visit' }, priority: 'NORMAL' }) });
console.log(JSON.stringify({ pass: true, organisation_id: organisation.id, template_id: template.id, version_id: version.id, version_state: published.lifecycle_state, deployment_id: deployment.id, assignment_id: assignment.id }, null, 2));
