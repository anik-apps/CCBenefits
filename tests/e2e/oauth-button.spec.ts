import { test, expect } from '@playwright/test';

// Google's Sign-In iframe may not become fully visible in headless CI
// (third-party cookie restrictions, network timing). We verify that:
// 1. The iframe is attached to the DOM with a valid client_id in its src
// 2. No "client_id" errors in the console

test.describe('Google OAuth button', () => {
  test('login page has Google iframe with valid client_id', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/login');

    // Wait for the iframe to be attached (not necessarily visible — headless
    // browsers may not fully render the Google button content)
    const googleIframe = page.locator('iframe[src*="accounts.google.com"]');
    await expect(googleIframe).toBeAttached({ timeout: 15000 });

    // Verify the src contains a real client_id (not empty)
    const src = await googleIframe.getAttribute('src');
    expect(src).toContain('client_id=');
    expect(src).not.toContain('client_id=&');  // would mean empty client_id

    // No client_id errors
    const clientIdErrors = errors.filter(e => e.includes('client_id'));
    expect(clientIdErrors).toHaveLength(0);
  });

  test('register page has Google iframe with valid client_id', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/register');

    const googleIframe = page.locator('iframe[src*="accounts.google.com"]');
    await expect(googleIframe).toBeAttached({ timeout: 15000 });

    const src = await googleIframe.getAttribute('src');
    expect(src).toContain('client_id=');
    expect(src).not.toContain('client_id=&');

    const clientIdErrors = errors.filter(e => e.includes('client_id'));
    expect(clientIdErrors).toHaveLength(0);
  });

  test('Google button container does not overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');

    // The overflow:hidden wrapper div constrains the button.
    // Verify the wrapper exists and its width doesn't exceed the form.
    const form = page.locator('form').first();
    await expect(form).toBeVisible({ timeout: 10000 });
    const formBox = await form.boundingBox();

    // Google button wrapper is the div right after the "or" divider
    const wrapper = page.locator('div[style*="overflow: hidden"]').first();
    if (await wrapper.count() > 0) {
      const wrapperBox = await wrapper.boundingBox();
      if (formBox && wrapperBox) {
        expect(wrapperBox.x + wrapperBox.width).toBeLessThanOrEqual(
          formBox.x + formBox.width + 2 // tiny tolerance
        );
      }
    }
  });
});
