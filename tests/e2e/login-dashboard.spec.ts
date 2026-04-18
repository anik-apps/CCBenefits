import { test, expect } from '@playwright/test';
import { registerUser, loginViaUI, bypassSplash, stableScreenshot } from './helpers';

test('login and see dashboard', async ({ page }) => {
  await bypassSplash(page);

  const { email, password } = await registerUser('Dashboard Test');

  // Screenshot: login page before login
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await stableScreenshot(page, 'login-page.png');

  await loginViaUI(page, email, password);

  // New user with no cards sees empty state
  await expect(page.locator('text=No cards yet')).toBeVisible();

  // Screenshot: empty dashboard
  await stableScreenshot(page, 'dashboard-empty.png');
});
