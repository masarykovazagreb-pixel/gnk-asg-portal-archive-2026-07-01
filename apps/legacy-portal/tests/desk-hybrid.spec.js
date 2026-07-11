const { test, expect } = require('@playwright/test');

async function openDesk(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#deskInput')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#deskTranscript')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#deskAiBadge')).toBeVisible({ timeout: 15000 });
}

async function submitDeskForm(page) {
  await page.locator('#deskInput').press('Enter');
}

async function activateConnectedAi(page) {
  const control = page.locator('.desk-switch button[data-mode="ai"]');
  await expect(control).toBeVisible({ timeout: 15000 });
  await expect(control).toBeEnabled({ timeout: 15000 });
  await control.click({ force: true, timeout: 5000 });
  await expect(control).toHaveClass(/active/, { timeout: 5000 });
}

test('Intelligence Desk answers from verified portal datasets', async ({ page }) => {
  await openDesk(page);
  await page.locator('#deskInput').fill('Koliko stablecoina prati portal?');
  await submitDeskForm(page);
  await expect(page.locator('#deskTranscript .desk-message.bot').last()).toContainText('Stablecoin Monitor', { timeout: 10000 });
  await expect(page.locator('#deskTranscript .desk-source a').last()).toContainText('Market Intelligence', { timeout: 10000 });
});

test('Connected AI mode uses active Puter Gemini adapter for broader questions', async ({ page }) => {
  await page.addInitScript(() => {
    window.puter = {
      ai: {
        chat: async (prompt, options) => {
          window.__puterPrompt = prompt;
          window.__puterModel = options.model;
          return { message: { content: 'Vanjski AI testni odgovor za šire javno pitanje.' } };
        }
      }
    };
  });
  await openDesk(page);
  await expect(page.locator('#deskAiBadge')).toContainText('AI aktivan', { timeout: 15000 });
  await activateConnectedAi(page);
  await page.locator('#deskInput').fill('Objasni globalne promjene u potrošačkim navikama.');
  await submitDeskForm(page);
  await expect(page.locator('#deskTranscript .desk-message.bot').last()).toContainText('Vanjski AI testni odgovor', { timeout: 10000 });
  await expect(page.locator('#deskTranscript .desk-message.bot').last()).toContainText('Puter.js / Google Gemini', { timeout: 10000 });
  expect(await page.evaluate(() => window.__puterModel)).toBe('gemini-2.5-flash-lite');
});

test('Connected AI mode refuses sensitive content locally before provider call', async ({ page }) => {
  await page.addInitScript(() => {
    window.__puterCalls = 0;
    window.puter = { ai: { chat: async () => { window.__puterCalls += 1; return 'ne smije se pozvati'; } } };
  });
  await openDesk(page);
  await expect(page.locator('#deskAiBadge')).toContainText('AI aktivan', { timeout: 15000 });
  await activateConnectedAi(page);
  await page.locator('#deskInput').fill('Provjeri moj IBAN i porezni ugovor.');
  await submitDeskForm(page);
  await expect(page.locator('#deskTranscript .desk-message.bot').last()).toContainText('nije poslan', { timeout: 10000 });
  expect(await page.evaluate(() => window.__puterCalls)).toBe(0);
});