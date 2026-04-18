import { test, expect } from '@playwright/test';
import { registerUser, loginViaUI, addCardViaAPI, bypassSplash, stableScreenshot } from './helpers';

test('log usage on a benefit', async ({ page }) => {
  await bypassSplash(page);

  const { email, password, token } = await registerUser('Usage Test');
  const cardId = await addCardViaAPI(token);
  await loginViaUI(page, email, password);

  // Wait for dashboard data to load, then navigate to card detail
  await page.waitForSelector(`a[href="/card/${cardId}"]`, { timeout: 10000 });
  await page.click(`a[href="/card/${cardId}"]`);
  await page.waitForURL(`/card/${cardId}`);

  // Screenshot: card detail before logging usage
  await stableScreenshot(page, 'card-detail.png');

  // Click the "+" button on a continuous benefit to open usage modal
  const logButton = page.locator('button').filter({ hasText: '+' }).first();
  await logButton.waitFor({ timeout: 10000 });
  await logButton.click();

  // Modal should appear
  const modal = page.locator('[data-testid="modal-backdrop"]');
  await expect(modal).toBeVisible({ timeout: 5000 });

  // Screenshot: usage modal open
  await stableScreenshot(page, 'usage-modal.png');
});
