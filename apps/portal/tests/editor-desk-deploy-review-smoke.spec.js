import { test, expect } from '@playwright/test';

const route = path => `http://127.0.0.1:4173${path}`;

async function expectAnyVisible(page, selectors, label) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count()) {
      try {
        await expect(locator, label).toBeVisible({ timeout: 5000 });
        return;
      } catch {}
    }
  }
  throw new Error(`Missing visible deploy-review contract target: ${label} (${selectors.join(', ')})`);
}

test.describe('Editor Desk deploy review smoke contract', () => {
  test('HR corporate index exposes finance, THE CODE, GNEW, admin, media and backend-fed layer fallback', async ({ page }) => {
    await page.goto(route('/'));

    await expect(page).toHaveTitle(/GNK ASG.*GNK DINAMO Ltd.*THE CODE/i);
    await expectAnyVisible(page, ['#financije', 'a[href="/financije/"]'], 'finance section or link');
    await expectAnyVisible(page, ['#the-code', '#gnk-index-code-show', 'a[href="/the-code/"]'], 'THE CODE section or link');
    await expectAnyVisible(page, ['a[href="/gnew-portal/"]'], 'GNEW Portal link');
    await expectAnyVisible(page, ['a[href="/admin/"]'], 'Admin link');
    await expectAnyVisible(page, ['a[href="/media-application/?lang=en"]'], 'Media application link');

    const backendLayer = page.locator('#gnk-backend-index-layer');
    if (await backendLayer.count()) {
      await expect(backendLayer.first()).toBeVisible({ timeout: 8000 });
    }
  });

  test('EN corporate index exposes matching public operating promises', async ({ page }) => {
    await page.goto(route('/en/'));

    await expect(page).toHaveTitle(/GNK ASG.*GNK DINAMO Ltd.*THE CODE/i);
    await expectAnyVisible(page, ['#financials', 'a[href="/financije/"]'], 'financials section or link');
    await expectAnyVisible(page, ['#gnk-index-code-show', '#the-code', 'a[href="/the-code/"]'], 'THE CODE section or link');
    await expectAnyVisible(page, ['#workers', 'a[href="/auto-editor/"]'], 'workers or editorial routing');
    await expectAnyVisible(page, ['#posts', 'a[href="/objave/"]', 'a[href="/publications/"]'], 'posts/publications routing');
    await expectAnyVisible(page, ['a[href="/media-application/?lang=en"]'], 'Media application link');
  });

  test('GNEW Portal remains the operational route map', async ({ page }) => {
    await page.goto(route('/gnew-portal/'));

    await expect(page).toHaveTitle(/GNEW Portal/i);
    await expect(page.locator('body')).toContainText(/Jedan ulaz|Control links|THE CODE/i);
    await expectAnyVisible(page, ['a[href="/admin/"]'], 'admin route');
    await expectAnyVisible(page, ['a[href="/mail-studio/"]'], 'mail studio route');
    await expectAnyVisible(page, ['a[href="/campaign-mailer/#dashboard"]'], 'campaign route');
    await expectAnyVisible(page, ['a[href="/media-application/?lang=en"]'], 'media route');
  });

  test('Admin route stays visible and clearly keeps campaign/bulk separated', async ({ page }) => {
    await page.goto(route('/admin/'));

    await expect(page).toHaveTitle(/Admin Control Center/i);
    await expect(page.locator('body')).toContainText(/Admin više ne smije bježati iz admina/i);
    await expect(page.locator('body')).toContainText(/Controlled mail test|Pojedinačna poruka/i);
    await expect(page.locator('body')).toContainText(/Bulk|Campaign/i);
    await expectAnyVisible(page, ['a[href="/gnew-portal/"]'], 'GNEW Portal from admin');
  });

  test('Critical public routes load without hiding the core corporate portal', async ({ page }) => {
    for (const path of ['/the-code/', '/media-application/?lang=en', '/public-operations/', '/objave/']) {
      await page.goto(route(path));
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });
});
