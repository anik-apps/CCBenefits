import { test, expect } from '@playwright/test';

test.describe('Google OAuth button', () => {
  test('renders on login page without errors', async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/login');

    // The Google button iframe should be present (rendered by @react-oauth/google)
    // If clientId is empty, the SDK logs an error and doesn't render the iframe
    const googleIframe = page.locator('iframe[src*="accounts.google.com"]');
    await expect(googleIframe).toBeVisible({ timeout: 10000 });

    // No "client_id" errors in console
    const clientIdErrors = errors.filter(e => e.includes('client_id'));
    expect(clientIdErrors).toHaveLength(0);
  });

  test('renders on register page without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/register');

    const googleIframe = page.locator('iframe[src*="accounts.google.com"]');
    await expect(googleIframe).toBeVisible({ timeout: 10000 });

    const clientIdErrors = errors.filter(e => e.includes('client_id'));
    expect(clientIdErrors).toHaveLength(0);
  });

  test('button does not overflow container', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone SE width
    await page.goto('/login');

    // Wait for the Google button container
    const googleDiv = page.locator('[id^="g_id_"]').first();
    await googleDiv.waitFor({ timeout: 10000 });

    const container = page.locator('form').first();
    const containerBox = await container.boundingBox();
    const buttonBox = await googleDiv.boundingBox();

    if (containerBox && buttonBox) {
      // Button right edge should not exceed container right edge + some padding
      expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(
        containerBox.x + containerBox.width + 24 // 24px padding allowance
      );
    }
  });
});
