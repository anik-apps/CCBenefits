import { test, expect } from '@playwright/test';
import { registerUser, loginViaUI, addCardViaAPI } from './helpers';

test('log usage on a benefit', async ({ page }) => {
  const { email, password, token } = await registerUser('Usage Test');
  const cardId = await addCardViaAPI(token);
  await loginViaUI(page, email, password);

  // Wait for dashboard data to load, then navigate to card detail
  await page.waitForSelector(`a[href="/card/${cardId}"]`, { timeout: 10000 });
  await page.click(`a[href="/card/${cardId}"]`);
  await page.waitForURL(`/card/${cardId}`);

  // Click the "+" button on a continuous benefit to open usage modal
  // (BenefitRow has no outer click handler — must target the log button)
  const logButton = page.locator('button').filter({ hasText: '+' }).first();
  await logButton.waitFor({ timeout: 10000 });
  await logButton.click();

  // Modal should appear (UsageModal uses data-testid="modal-backdrop")
  const modal = page.locator('[data-testid="modal-backdrop"]');
  await expect(modal).toBeVisible({ timeout: 5000 });
});
