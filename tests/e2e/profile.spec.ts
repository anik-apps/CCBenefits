import { test, expect } from '@playwright/test';
import { registerUser, loginViaUI, bypassSplash, stableScreenshot } from './helpers';

test.describe('Profile page', () => {
  test('view profile with user info', async ({ page }) => {
    await bypassSplash(page);

    const { email, password } = await registerUser('Profile Test');
    await loginViaUI(page, email, password);

    // Open UserMenu dropdown (button shows the display name)
    await page.locator('button', { hasText: 'Profile Test' }).click();
    // Click the "Profile" link inside the dropdown
    await page.click('a[href="/profile"]');
    await page.waitForURL('/profile');

    // Verify user email is displayed
    await expect(page.locator(`text=${email}`)).toBeVisible({ timeout: 5000 });

    // Verify section headers
    await expect(page.locator('h3', { hasText: 'Account Settings' })).toBeVisible();

    // Screenshot: profile page (mask the dynamic email)
    await stableScreenshot(page, 'profile.png', {
      mask: [page.locator(`text=${email}`)],
    });
  });
});
