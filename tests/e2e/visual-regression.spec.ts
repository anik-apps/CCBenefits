import { test, expect } from '@playwright/test';
import {
  registerUser,
  loginViaUI,
  seedUserWithCards,
  bypassSplash,
  stableScreenshot,
} from './helpers';

test.describe('Visual regression baselines', () => {
  test('login page', async ({ page }) => {
    await bypassSplash(page);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await stableScreenshot(page, 'vr-login.png');
  });

  test('register page', async ({ page }) => {
    await bypassSplash(page);
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await stableScreenshot(page, 'vr-register.png');
  });

  test('dashboard empty state', async ({ page }) => {
    await bypassSplash(page);
    const { email, password } = await registerUser('VR Empty');
    await loginViaUI(page, email, password);
    await expect(page.locator('text=No cards yet')).toBeVisible();
    await stableScreenshot(page, 'vr-dashboard-empty.png');
  });

  test('dashboard with cards', async ({ page }) => {
    await bypassSplash(page);
    const { email, password } = await seedUserWithCards('VR Cards', 2);
    await loginViaUI(page, email, password);
    await expect(page.locator('text=Your Cards')).toBeVisible({ timeout: 10000 });
    await stableScreenshot(page, 'vr-dashboard-cards.png');
  });

  test('card detail page', async ({ page }) => {
    await bypassSplash(page);
    const { email, password, cardIds } = await seedUserWithCards('VR Detail');
    await loginViaUI(page, email, password);

    await page.waitForSelector(`a[href="/card/${cardIds[0]}"]`, { timeout: 10000 });
    await page.click(`a[href="/card/${cardIds[0]}"]`);
    await page.waitForURL(`/card/${cardIds[0]}`);
    await stableScreenshot(page, 'vr-card-detail.png');
  });

  test('add card template picker', async ({ page }) => {
    await bypassSplash(page);
    const { email, password } = await registerUser('VR AddCard');
    await loginViaUI(page, email, password);

    await page.click('a[title="Add a card"]');
    await page.waitForURL('/add-card');
    await stableScreenshot(page, 'vr-add-card.png');
  });

  test('all credits by-period view', async ({ page }) => {
    await bypassSplash(page);
    const { email, password } = await seedUserWithCards('VR Period');
    await loginViaUI(page, email, password);

    // Use direct navigation — header tab is hidden at mobile viewport
    await page.goto('/credits');
    await page.waitForLoadState('networkidle');
    await stableScreenshot(page, 'vr-credits-period.png');
  });

  test('all credits by-card view', async ({ page }) => {
    await bypassSplash(page);
    const { email, password } = await seedUserWithCards('VR ByCard');
    await loginViaUI(page, email, password);

    await page.goto('/credits');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("By Card")');
    await page.waitForLoadState('networkidle');
    await stableScreenshot(page, 'vr-credits-card.png');
  });

  test('all credits sheet view', async ({ page }) => {
    await bypassSplash(page);
    const { email, password } = await seedUserWithCards('VR Sheet');
    await loginViaUI(page, email, password);

    await page.goto('/credits');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Sheet")');
    await page.waitForLoadState('networkidle');
    await stableScreenshot(page, 'vr-credits-sheet.png');
  });

  test('profile page', async ({ page }) => {
    await bypassSplash(page);
    const { email, password } = await registerUser('VR Profile');
    await loginViaUI(page, email, password);

    // Open UserMenu dropdown, then click Profile link
    await page.locator('button', { hasText: 'VR Profile' }).click();
    await page.click('a[href="/profile"]');
    await page.waitForURL('/profile');
    await stableScreenshot(page, 'vr-profile.png', {
      mask: [page.locator(`text=${email}`)],
    });
  });
});
