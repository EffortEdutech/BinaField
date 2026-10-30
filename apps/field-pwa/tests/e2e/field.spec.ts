import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';

const ORG = 'a0000000-0000-4000-8000-000000000001', ASG = 'a0000000-0000-4000-8000-000000000017', TV = 'a0000000-0000-4000-8000-000000000015';
const canon = (v: any): string => Array.isArray(v) ? `[${v.map(canon).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}` : JSON.stringify(v);
const BP = { title: 'Demo site check', fields: [{ id: 'status', type: 'select', label: 'Site status', options: ['OK', 'ATTENTION', 'FAIL'], required: true }, { id: 'notes', type: 'text', label: 'Notes', required: false }, { id: 'photos', type: 'photo', label: 'Site photo', required: true }], schema: 'bf-blueprint/1.0' };
const BP_HASH = createHash('sha256').update(canon(BP)).digest('hex');

/** A stand-in for the BinaField API, Supabase auth and storage, with the same duplicate rules as the real server. */
function mockServer(page: Page) {
  const s = { down: false, attempts: new Map<string, string>(), uploads: new Map<string, { size: number; put: boolean }>(), submissionPosts: 0, acks: 0, flakyFirstFinalize: false };
  const base = 'https://binafield-api.vercel.app/api/organizations/' + ORG;
  const json = (route: any, status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  const guard = (fn: (route: any) => Promise<void> | void) => async (route: any) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (s.down) return route.abort('connectionfailed');
    return fn(route);
  };
  return page.route('https://plpaixewllldutjrjljg.supabase.co/auth/v1/token*', guard((r) => json(r, 200, { access_token: 'tok', refresh_token: 'ref', expires_in: 3600, user: { email: 't@x' } })))
    .then(() => page.route(`${base}/**`, guard(async (route) => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname.replace(`/api/organizations/${ORG}`, '');
      if (req.method() === 'GET' && path === '/field/delta') {
        if (url.searchParams.get('cursor')) return json(route, 200, { entries: [], next_cursor: url.searchParams.get('cursor') });
        return json(route, 200, { next_cursor: 'c1:1', entries: [{ delta_id: 'd1', entity_type: 'assignment', entity_id: ASG, entity_revision: 1, change_type: 'UPSERT', occurred_at: new Date().toISOString(), payload: { assignment_id: ASG, assignment_revision: 1, template_version_id: TV, blueprint_hash: BP_HASH, payload: { project_id: 'p1', deployment_id: 'dep1', lifecycle_state: 'ASSIGNED', operational_subject_ref: { name: 'Demo site' }, blueprint: BP } } }] });
      }
      if (path === '/field/acknowledgements') { s.acks++; return json(route, 200, { cursor: 'c1:1' }); }
      if (path === '/evidence/uploads') { const b = req.postDataJSON(); s.uploads.set(b.attachment_id, { size: b.byte_size, put: false }); return json(route, 201, { upload_id: b.attachment_id, provider_upload_reference: `https://storage.test/put/${b.attachment_id}` }); }
      const fin = /^\/evidence\/uploads\/([^:]+):finalize$/.exec(path);
      if (fin) {
        if (s.flakyFirstFinalize) { s.flakyFirstFinalize = false; return json(route, 503, { code: 'TEMPORARILY_UNAVAILABLE', retryable: true }); }
        const u = s.uploads.get(fin[1]!); if (!u?.put) return json(route, 409, { code: 'OBJECT_MISSING', retryable: true });
        return json(route, 200, { attachment_id: fin[1], integrity_state: 'VERIFIED' });
      }
      if (req.method() === 'POST' && path === '/field/submission-attempts') {
        s.submissionPosts++; const b = req.postDataJSON(); const key = req.headers()['idempotency-key']!;
        const seen = s.attempts.get(key);
        if (seen === b.payload_hash) return json(route, 200, { attempt_id: b.attempt_id, replay: true });
        s.attempts.set(key, b.payload_hash); return json(route, 201, { attempt_id: b.attempt_id });
      }
      return json(route, 404, { code: 'NOT_FOUND' });
    }))).then(() => page.route('https://storage.test/**', guard((route) => {
      const id = route.request().url().split('/').pop()!; const u = s.uploads.get(id); if (u) u.put = true;
      return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, body: '{}' });
    }))).then(() => s);
}

test('offline capture, reconnect, server has exactly one record', async ({ page }) => {
  const srv = await mockServer(page);
  await page.goto('/');
  await page.getByTestId('email').fill('t@x'); await page.getByTestId('password').fill('pw'); await page.getByTestId('login').click();
  await expect(page.getByTestId('assignment')).toHaveCount(1, { timeout: 30_000 });

  // go offline, fill in the form, take a photo, submit
  srv.down = true; await page.context().setOffline(true);
  await page.getByTestId('open-form').click();
  await page.getByTestId('f-status').selectOption('OK');
  await page.getByTestId('f-notes').fill('Gate lock replaced');
  await expect(page.getByTestId('submit')).toBeDisabled();           // photo still missing
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('add-photos').click();
  await (await chooser).setFiles({ name: 'p.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(Array.from({ length: 4096 }, (_, i) => i % 251)) });
  await expect(page.getByTestId('photo')).toHaveCount(1);
  await expect(page.getByTestId('photo').getByRole('img', { name: 'Captured evidence preview' })).toBeVisible();
  await expect(page.getByTestId('photo').getByRole('button', { name: 'Remove photo' })).toBeVisible();
  await page.getByTestId('submit').click();
  await expect(page.getByTestId('exec-status')).toHaveText('Submitted — waiting to sync');
  expect(srv.attempts.size).toBe(0);
  expect(Number(await page.getByTestId('pending').innerText())).toBeGreaterThanOrEqual(4);

  // still offline: pressing Sync must not lose or duplicate anything
  await page.getByTestId('sync').click();
  expect(srv.attempts.size).toBe(0);

  // reconnect; first finalize is flaky to exercise retry
  srv.down = false; srv.flakyFirstFinalize = true; await page.context().setOffline(false);
  await expect.poll(async () => { await page.getByTestId('sync').click(); return srv.attempts.size; }, { timeout: 60_000, intervals: [1500] }).toBe(1);
  await page.getByTestId('sync').click();
  await expect.poll(async () => Number(await page.getByTestId('pending').innerText()), { timeout: 30_000 }).toBe(0);

  // press sync several more times: server still holds one record, nothing re-sent
  const posts = srv.submissionPosts;
  for (let i = 0; i < 3; i++) await page.getByTestId('sync').click();
  expect(srv.attempts.size).toBe(1);
  expect(srv.submissionPosts).toBe(posts);
  expect(srv.acks).toBeGreaterThan(0);

  // survive a reload: local state persisted, still one record, nothing queued
  await page.reload();
  await expect(page.getByTestId('exec-status')).toHaveText('Submitted — waiting to sync');
  await page.getByTestId('sync').click();
  expect(srv.attempts.size).toBe(1);
});
