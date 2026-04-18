import { Page, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

export async function registerUser(name: string): Promise<{ email: string; password: string; token: string }> {
  const email = `e2e-${crypto.randomUUID().slice(0, 12)}@e2etest.com`;
  const password = 'testpass123';
  const resp = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, display_name: name }),
  });
  const data = await resp.json();
  return { email, password, token: data.access_token };
}

export async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 10000 });
}

export async function addCardViaAPI(token: string): Promise<number> {
  const templatesResp = await fetch(`${BASE_URL}/api/card-templates/`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const templates = await templatesResp.json();
  const resp = await fetch(`${BASE_URL}/api/user-cards/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ card_template_id: templates[0].id }),
  });
  const card = await resp.json();
  return card.id;
}

// --- Screenshot & setup helpers ---

/**
 * Bypass the 6-second splash animation.
 * Must be called before any page.goto() in the test.
 */
export async function bypassSplash(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('ccb-splash-shown', 'true');
  });
}

/**
 * Take a stable screenshot: waits for fonts and network idle before capture.
 */
export async function stableScreenshot(
  page: Page,
  name: string,
  options?: { mask?: ReturnType<Page['locator']>[]; fullPage?: boolean }
) {
  await page.waitForFunction(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot(name, {
    animations: 'disabled',
    ...options,
  });
}

/**
 * Register a user and add cards via API. Returns auth details and card IDs.
 */
export async function seedUserWithCards(
  name: string,
  cardCount: number = 1
): Promise<{ email: string; password: string; token: string; cardIds: number[] }> {
  const { email, password, token } = await registerUser(name);
  const cardIds: number[] = [];
  for (let i = 0; i < cardCount; i++) {
    cardIds.push(await addCardViaAPI(token));
  }
  return { email, password, token, cardIds };
}
