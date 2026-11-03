const supabaseUrl = process.env.BINAField_SUPABASE_URL ?? 'https://plpaixewllldutjrjljg.supabase.co';
const anonKey = process.env.BINAField_ANON_KEY ?? 'sb_publishable_nwgPId71eV6WnxgZ91NtiA_N6VjGuKQ';
const api = process.env.BINAField_API ?? 'https://binafield-api.vercel.app/api';
const email = process.env.BINAField_EMAIL;
const password = process.env.BF_PASSWORD;
const deviceId = process.env.BINAField_DEVICE_ID ?? 'a0000000-0000-4000-8000-000000000005';

const check = (name, pass) => console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
async function request(url, options = {}) {
  const response = await fetch(url, options);
  let body = null; try { body = await response.json(); } catch { /* empty */ }
  if (!response.ok) throw new Error(`${response.status} ${body?.code ?? response.statusText}`);
  return body;
}

if (!email || !password) {
  console.error('Set BINAField_EMAIL and BF_PASSWORD in the local shell. Secrets are never printed.');
  process.exitCode = 2;
} else {
  try {
    const session = await request(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { apikey: anonKey, 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    check('field email/password login', Boolean(session.access_token && session.refresh_token));
    const auth = { authorization: `Bearer ${session.access_token}` };
    const organisations = await request(`${api}/organizations`, { headers: auth });
    const organisation = organisations.items?.[0];
    check('field organisation selection source', Boolean(organisation));
    if (!organisation) throw new Error('No active organisation membership found');
    const me = await request(`${api}/organizations/${organisation.id}/me`, { headers: auth });
    check('field role-based permission context', Array.isArray(me.permissions));
    const device = await request(`${api}/organizations/${organisation.id}/me`, { headers: { ...auth, 'x-device-id': deviceId } });
    check('field guided device status', ['ACTIVE', 'NOT_REGISTERED', 'SUSPENDED', 'REVOKED'].includes(device.device_state));
    const refreshed = await request(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST', headers: { apikey: anonKey, 'content-type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    check('field session refresh', Boolean(refreshed.access_token));
    console.log(JSON.stringify({ pass: true, organisation: organisation.name, device_state: device.device_state }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ pass: false, error: String(error) }, null, 2));
    process.exitCode = 1;
  }
}
