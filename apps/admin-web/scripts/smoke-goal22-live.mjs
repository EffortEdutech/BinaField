const supabaseUrl = process.env.BINAField_SUPABASE_URL ?? 'https://plpaixewllldutjrjljg.supabase.co';
const anonKey = process.env.BINAField_ANON_KEY ?? 'sb_publishable_nwgPId71eV6WnxgZ91NtiA_N6VjGuKQ';
const api = process.env.BINAField_API ?? 'https://binafield-api.vercel.app/api';
const email = process.env.BINAField_EMAIL;
const password = process.env.BF_PASSWORD;
const deviceId = process.env.BINAField_DEVICE_ID ?? 'a0000000-0000-4000-8000-000000000005';

if (!email || !password) {
  console.error('Set BINAField_EMAIL and BF_PASSWORD in the local shell. Secrets are never printed.');
  process.exitCode = 2;
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  let body = null;
  try { body = await response.json(); } catch { /* empty response */ }
  if (!response.ok) throw new Error(`${response.status} ${body?.code ?? body?.error ?? response.statusText}`);
  return body;
}

const check = (name, value) => console.log(`${value ? 'PASS' : 'FAIL'}  ${name}`);

if (email && password) {
  try {
    const session = await request(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { apikey: anonKey, 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    check('email/password login', Boolean(session.access_token && session.refresh_token));

    const auth = { authorization: `Bearer ${session.access_token}` };
    const organisations = await request(`${api}/organizations`, { headers: auth });
    check('organisation selection source', Array.isArray(organisations.items) && organisations.items.length > 0);
    const organisation = organisations.items?.[0];
    if (!organisation) {
      const probe = await fetch(`${api}/organizations/a0000000-0000-4000-8000-000000000001/me`, { headers: auth });
      let probeBody = null; try { probeBody = await probe.json(); } catch { /* empty response */ }
      throw new Error(`No active organisation membership found; known-org probe ${probe.status} ${probeBody?.code ?? ''}`.trim());
    }
    check('role returned for selected organisation', Array.isArray(organisation.roles));

    const me = await request(`${api}/organizations/${organisation.id}/me`, { headers: auth });
    check('role-based permission context', Array.isArray(me.permissions));
    const device = await request(`${api}/organizations/${organisation.id}/me`, { headers: { ...auth, 'x-device-id': deviceId } });
    check('guided device status available', ['ACTIVE', 'NOT_REGISTERED', 'SUSPENDED', 'REVOKED'].includes(device.device_state));

    const refreshed = await request(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST', headers: { apikey: anonKey, 'content-type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    check('session refresh', Boolean(refreshed.access_token));
    console.log(JSON.stringify({ pass: true, organisation: organisation.name, device_state: device.device_state }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ pass: false, error: String(error) }, null, 2));
    process.exitCode = 1;
  }
}
