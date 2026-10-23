import { test, expect } from '@playwright/test';

test('G1-G6 local-store gate checks all pass in the browser', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('run-gate').click();
  const panel = page.getByTestId('gate-results');
  await expect(panel).toBeVisible({ timeout: 60_000 });
  const lines = await page.locator('[data-testid^="gate-G"]').allInnerTexts();
  console.log(lines.join('\n'));
  for (const id of ['G1', 'G2', 'G3', 'G4', 'G5', 'G6']) {
    await expect(page.getByTestId(`gate-${id}`)).toHaveAttribute('data-pass', 'true');
  }
  await expect(panel).toHaveAttribute('data-all-pass', 'true');
});
