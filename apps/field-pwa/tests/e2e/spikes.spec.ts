import { test, expect } from '@playwright/test';

// Desktop smoke of the spike screens. The real answers come from real phones (ADR-0003); this only
// proves the screens work and the pass logic is not broken.
test('spike 1: seed then verify keeps every hash', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('toggle-spikes').click();
  const s1 = page.locator('section', { hasText: 'Spike 1' });
  await s1.locator('input[type=number]').fill('10');
  await s1.getByRole('button', { name: 'Seed' }).click();
  await expect(s1).toContainText('seeded 5 files', { timeout: 30_000 });
  await s1.getByRole('button', { name: 'Verify' }).click();
  await expect(s1).toContainText('verified 5/5, bad 0', { timeout: 30_000 });
});

test('spike 4: write, stop, check reports intact batches', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('toggle-spikes').click();
  const s4 = page.locator('section', { hasText: 'Spike 4' });
  await s4.getByRole('button', { name: 'Start writing' }).click();
  await expect(s4).toContainText('committed batch 0', { timeout: 30_000 });
  await s4.getByRole('button', { name: 'Stop' }).click();
  await page.waitForTimeout(1500);
  await s4.getByRole('button', { name: 'Check database' }).click();
  await expect(s4).toContainText('PASS', { timeout: 30_000 });
});

test('spike 3: photo hash survives OPFS write and read-back', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('toggle-spikes').click();
  const s3 = page.locator('section', { hasText: 'Spike 3' });
  // Minimal JPEG-like bytes with an Exif APP1 header and a GPS tag in IFD0.
  const jpeg = Buffer.from('ffd8ffe1002a457869660000' + '4d4d002a00000008' + '0001' + '8825000400000001' + '00000000' + '00000000ffd9', 'hex');
  await s3.locator('input[type=file]').setInputFiles({ name: 'p.jpg', mimeType: 'image/jpeg', buffer: jpeg });
  await expect(s3).toContainText('opfs PASS', { timeout: 30_000 });
  await expect(s3).toContainText('exif true, gpsTag true');
});
