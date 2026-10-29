const api = process.env.BINAFIELD_API ?? 'https://binafield-api.vercel.app/api';
const token = process.env.BINAField_TOKEN;
const org = process.env.BINAFIELD_ORG ?? 'a0000000-0000-4000-8000-000000000001';
const project = process.env.BINAFIELD_PROJECT ?? 'a0000000-0000-4000-8000-000000000010';
const deployment = process.env.BINAFIELD_DEPLOYMENT ?? 'a0000000-0000-4000-8000-000000000016';
const assignee = process.env.BINAFIELD_ASSIGNEE ?? 'a0000000-0000-4000-8000-000000000002';
if (!token) throw new Error('Set BINAField_TOKEN in the local shell; the token is never printed.');
const headers = () => ({ authorization: `Bearer ${token}` });
async function call(path, init = {}) {
  const response = await fetch(`${api}${path}`, { ...init, headers: { ...headers(), ...(init.headers ?? {}) } });
  const body = await response.json();
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${response.status} ${body.code ?? ''} ${body.detail ?? ''}`);
  return body;
}
const json = (body, key) => ({ 'content-type': 'application/json', 'idempotency-key': `${key}-${crypto.randomUUID()}` });
const blueprint = { schema: 'bf-blueprint/1.0', title: 'Admin Studio smoke inspection', fields: [{ id: 'status', type: 'select', label: 'Site status', options: ['OK', 'FAIL'], required: true }, { id: 'notes', type: 'text', label: 'Notes', required: false }] };
const result = { pass: false, checks: [] };
try {
  const me = await call(`/organizations/${org}/me`); result.checks.push({ name: 'organisation context', pass: me.organization_id === org });
  const template = await call(`/organizations/${org}/templates`, { method: 'POST', headers: json({}, 'admin-smoke-template'), body: JSON.stringify({ template_key: `admin-smoke-${Date.now()}`, name: 'Admin Studio smoke template' }) });
  result.checks.push({ name: 'template creation', pass: template.lifecycle_state === 'DRAFT' });
  const version = await call(`/organizations/${org}/templates/${template.id}/versions`, { method: 'POST', headers: json({}, 'admin-smoke-version'), body: JSON.stringify({ blueprint_json: blueprint }) });
  const validated = await call(`/organizations/${org}/template-versions/${version.id}:validate`, { method: 'POST', headers: headers() });
  const published = await call(`/organizations/${org}/template-versions/${version.id}:publish`, { method: 'POST', headers: json({}, 'admin-smoke-publish') });
  result.checks.push({ name: 'version validate and publish', pass: validated.lifecycle_state === 'VALIDATED' && published.lifecycle_state === 'PUBLISHED' });
  const createdDeployment = await call(`/organizations/${org}/deployments`, { method: 'POST', headers: json({}, 'admin-smoke-deployment'), body: JSON.stringify({ project_id: project, template_version_id: version.id, name: 'Admin Studio smoke deployment' }) });
  const assignment = await call(`/organizations/${org}/assignments`, { method: 'POST', headers: json({}, 'admin-smoke-assignment'), body: JSON.stringify({ project_id: project, deployment_id: createdDeployment.id, template_version_id: version.id, assignee_membership_id: assignee, operational_subject_ref: { label: 'Admin Studio smoke' } }) });
  const assignments = await call(`/organizations/${org}/assignments`); result.checks.push({ name: 'assignment issued and persisted', pass: assignment.lifecycle_state === 'ASSIGNED' && assignments.items.some(x => x.id === assignment.id) });
  const submissions = await call(`/organizations/${org}/submissions`); result.checks.push({ name: 'submission review queue readable', pass: Array.isArray(submissions.items) });
  const candidate = submissions.items.find(x => x.submission_id);
  if (candidate) {
    const decision = await call(`/organizations/${org}/submissions/${candidate.submission_id}/review`, { method: 'POST', headers: { ...headers(), 'content-type': 'application/json' }, body: JSON.stringify({ decision: 'ACCEPT' }) });
    const outcome = await call(`/organizations/${org}/field/submission-attempts/${candidate.attempt_id}/outcome`);
    result.checks.push({ name: 'supervisor decision and persisted outcome', pass: decision.status === 'ACCEPTED' && outcome.status === 'ACCEPTED' });
  } else {
    result.checks.push({ name: 'supervisor decision and persisted outcome', pass: false, pending: true, detail: 'No received submission exists to review' });
  }
  result.pass = result.checks.every(x => x.pass); result.ids = { template_id: template.id, version_id: version.id, deployment_id: createdDeployment.id, assignment_id: assignment.id };
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.pass ? 0 : 1;
} catch (error) { result.error = String(error); console.log(JSON.stringify(result, null, 2)); process.exitCode = 1; }
