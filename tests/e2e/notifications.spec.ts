import { test, expect } from '@playwright/test';
import { registerUser, loginViaUI, bypassSplash, stableScreenshot } from './helpers';

test.describe('Notification panel', () => {
  test('open notification dropdown and see empty state', async ({ page }) => {
    await bypassSplash(page);

    const { email, password } = await registerUser('Notif Test');
    await loginViaUI(page, email, password);

    // Click the bell button to open the notification dropdown
    await page.click('[data-testid="notification-bell"]');

    // Verify empty state text in the dropdown
    await expect(page.locator('text=No notifications yet')).toBeVisible({ timeout: 5000 });

    // Screenshot: notification panel dropdown
    await stableScreenshot(page, 'notifications-empty.png');
  });
});
