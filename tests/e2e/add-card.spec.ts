import { test, expect } from '@playwright/test';
import { registerUser, loginViaUI, bypassSplash, stableScreenshot } from './helpers';

test('add a card and see it on dashboard', async ({ page }) => {
  await bypassSplash(page);

  const { email, password } = await registerUser('AddCard Test');
  await loginViaUI(page, email, password);

  // Click add card FAB
  await page.click('a[title="Add a card"]');
  await page.waitForURL('/add-card');

  // Screenshot: template picker
  await stableScreenshot(page, 'add-card-picker.png');

  // Click "Add" on the first card template (expands nickname panel)
  await page.locator('button', { hasText: /^Add$/ }).first().click();

  // Click "Add Card" confirmation button in the expanded panel
  await page.locator('button', { hasText: /^Add Card$/ }).first().click();

  // Should redirect back to dashboard with the card
  await page.waitForURL('/', { timeout: 10000 });
  await expect(page.locator('text=Your Cards')).toBeVisible({ timeout: 10000 });

  // Screenshot: dashboard with card
  await stableScreenshot(page, 'dashboard-with-card.png');
});
