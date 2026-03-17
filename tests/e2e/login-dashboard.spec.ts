import { test, expect } from '@playwright/test';
import { registerUser, loginViaUI } from './helpers';

test('login and see dashboard', async ({ page }) => {
  const { email, password } = await registerUser('Dashboard Test');
  await loginViaUI(page, email, password);
  // New user with no cards sees empty state
  await expect(page.locator('text=No cards yet')).toBeVisible();
});
