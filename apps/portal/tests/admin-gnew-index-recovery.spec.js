import { test, expect } from '@playwright/test';

test.describe('Admin / GNEW / Index recovery contract', () => {
  test('admin no longer redirects away and exposes safe mail diagnostics', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173/admin/');

    await expect(page).toHaveTitle(/GNK ASG Admin Control Center/);
    await expect(page.locator('body')).toContainText('Admin više ne smije bježati iz admina.');
    await expect(page.locator('body')).toContainText('Controlled mail test');
    await expect(page.locator('body')).toContainText('Bulk/campaign live slanje ostaje zaključano');
    await expect(page.locator('a[href="/gnew-portal/"]')).toBeVisible();
  });

  test('GNEW portal exposes operational route map and THE CODE / 9 language', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173/gnew-portal/');

    await expect(page).toHaveTitle(/GNEW Portal/);
    await expect(page.locator('body')).toContainText('Jedan ulaz: index, admin, THE CODE, mail, media i 9 sektora.');
    await expect(page.locator('body')).toContainText('Devet sektora');
    await expect(page.locator('a[href="/admin/"]')).toBeVisible();
    await expect(page.locator('a[href="/campaign-mailer/#dashboard"]')).toBeVisible();
  });

  test('HR index links GNEW portal and keeps finance, code show, workers and media entry', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173/');

    await expect(page).toHaveTitle(/GNK ASG d\.o\.o\..*GNK DINAMO Ltd\. Group.*THE CODE/);
    await expect(page.locator('#financije')).toBeVisible();
    await expect(page.locator('#gnk-index-code-show')).toBeVisible();
    await expect(page.locator('#projects')).toBeVisible();
    await expect(page.locator('#workers')).toBeVisible();
    await expect(page.locator('a[href="/gnew-portal/"]').first()).toBeVisible();
    await expect(page.locator('a[href="/media-application/?lang=en"]').first()).toBeVisible();
  });

  test('HR index renders backend workforce, project and feed layer', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173/');

    await expect(page.locator('#gnk-backend-index-layer')).toBeVisible();
    await expect(page.locator('#workforce-runtime')).toContainText('1.537 operativnih profila');
    await expect(page.locator('#workforce-runtime')).toContainText('GNK-');
    await expect(page.locator('#workforce-runtime')).toContainText('coded operating companies');
    await expect(page.locator('#worker-results')).toContainText('GNK-WRK-HR-FIN-001');
    await expect(page.locator('#project-business')).toContainText('THE CODE');
    await expect(page.locator('#public-feed')).toContainText('Objave');
  });
});
