import { Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

export async function registerUser(name: string): Promise<{ email: string; password: string; token: string }> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@e2e.test`;
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
