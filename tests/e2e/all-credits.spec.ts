import { test, expect } from '@playwright/test';
import { seedUserWithCards, loginViaUI, bypassSplash, stableScreenshot } from './helpers';

test.describe('All Credits page', () => {
  test('switch between period, card, and sheet views', async ({ page }) => {
    await bypassSplash(page);

    const { email, password } = await seedUserWithCards('Credits Test');
    await loginViaUI(page, email, password);

    // Navigate to All Credits — use direct navigation (works on all viewports)
    await page.goto('/credits');
    await page.waitForLoadState('networkidle');

    // Default view is "By Period"
    await expect(page.locator('button', { hasText: 'By Period' })).toBeVisible();

    // Screenshot: by-period view
    await stableScreenshot(page, 'all-credits-by-period.png');

    // Switch to by-card view
    await page.click('button:has-text("By Card")');
    await page.waitForLoadState('networkidle');
    await stableScreenshot(page, 'all-credits-by-card.png');

    // Switch to sheet view
    await page.click('button:has-text("Sheet")');
    await page.waitForLoadState('networkidle');
    await stableScreenshot(page, 'all-credits-sheet.png');
  });
});
