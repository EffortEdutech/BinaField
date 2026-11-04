const supabaseUrl = process.env.BINAField_SUPABASE_URL ?? 'https://plpaixewllldutjrjljg.supabase.co';
const anonKey = process.env.BINAField_ANON_KEY ?? 'sb_publishable_nwgPId71eV6WnxgZ91NtiA_N6VjGuKQ';
const api = process.env.BINAField_API ?? 'https://binafield-api.vercel.app/api';
const email = process.env.BINAField_EMAIL;
const password = process.env.BF_PASSWORD;
const assignmentId = process.env.BINAFIELD_ASSIGNMENT ?? 'a657377a-42a5-454a-aec7-7da85faed7a4';
if (!email || !password) throw new Error('Set BINAField_EMAIL and BF_PASSWORD in the local shell; secrets are never printed.');
async function request(url, options = {}) {
  const response = await fetch(url, options);
  let body = null; try { body = await response.json(); } catch { /* empty */ }
  if (!response.ok) throw new Error(`${response.status} ${body?.code ?? response.statusText}`);
  return body;
}
const session = await request(`${supabaseUrl}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: anonKey, 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
const auth = { authorization: `Bearer ${session.access_token}` };
const organisations = await request(`${api}/organizations`, { headers: auth });
const organisation = organisations.items?.[0];
if (!organisation) throw new Error('No active organisation membership found');
const submissions = await request(`${api}/organizations/${organisation.id}/submissions`, { headers: auth });
const matching = (submissions.items ?? []).filter((item) => item.assignment_id === assignmentId);
const submission = matching.find((item) => item.submission_id);
if (!submission?.submission_id) {
  console.log(JSON.stringify({
    pass: false,
    assignment_id: assignmentId,
    matching_attempts: matching.map((item) => ({
      attempt_id: item.attempt_id,
      submission_id: item.submission_id || null,
      status: item.status,
      rejection_code: item.rejection_code ?? null,
      received_at: item.received_at ?? null,
    })),
  }, null, 2));
  throw new Error(matching.length ? 'Kebuniti attempt arrived but has no accepted submission record' : 'Kebuniti submission attempt is not yet visible in the Admin review queue');
}
const report = await request(`${api}/organizations/${organisation.id}/reports/kebuniti/${submission.submission_id}`, { headers: auth });
const result = {
  pass: report.report_type === 'KEBUNITI_FIELD_DATA_LOG' && report.provenance?.assignment_id === assignmentId && report.calculations?.report_ready === true,
  submission_id: submission.submission_id,
  report_status: report.report_status,
  calculations: report.calculations,
  evidence_count: report.sections?.evidence?.length ?? 0,
  provenance: report.provenance,
};
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
