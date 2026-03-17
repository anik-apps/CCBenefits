import { test, expect } from '@playwright/test';
import { registerUser, loginViaUI } from './helpers';

test('add a card and see it on dashboard', async ({ page }) => {
  const { email, password } = await registerUser('AddCard Test');
  await loginViaUI(page, email, password);

  // Click add card FAB
  await page.click('a[title="Add a card"]');
  await page.waitForURL('/add-card');

  // Click "Add" on the first card template to expand it
  await page.locator('button').filter({ hasText: 'Add' }).first().click();
  // Click "Add Card" confirmation button in the expanded panel
  await page.locator('button').filter({ hasText: 'Add Card' }).first().click();

  // Should redirect back to dashboard with the card
  await page.waitForURL('/');
  await expect(page.locator('text=Your Cards')).toBeVisible();
});
