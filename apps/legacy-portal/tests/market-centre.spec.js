const { test, expect } = require('@playwright/test');

const routes = [
  { path: '/trzista/', heading: 'Stablecoini, burze i digitalna imovina' },
  { path: '/en/markets/', heading: 'Stablecoins, exchanges and digital assets' }
];

for (const route of routes) {
  test(`${route.path} prikazuje tržišni centar, 3D vizualizaciju i ASG alat`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText(route.heading, { timeout: 15000 });
    await expect(page.locator('#marketCentreCoins')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#stablecoinRows')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#exchangeRows')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#indexCards')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#briefTitle')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#aiFab')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#aiFab .ai-fab-mark')).toContainText('ASG');
    const canvas = page.locator('#marketConstellation');
    await expect(canvas).toBeVisible({ timeout: 15000 });
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box.x + box.width * 0.48, box.y + box.height * 0.48);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.64, box.y + box.height * 0.38, { steps: 7 });
    await page.mouse.up();
    await expect(page.locator('#constellationDetail')).toBeVisible({ timeout: 15000 });
  });
}

const homepageRoutes = [
  { path: '/', panelTitle: 'Globalna mreža: 33 postojeća društva i +12 planiranih lokacija', bpp: 'Bitcoin Payment Processor' },
  { path: '/en/', panelTitle: 'Global network: 33 existing companies and +12 planned locations', bpp: 'Bitcoin Payment Processor' }
];

for (const route of homepageRoutes) {
  test(`${route.path} prikazuje globus kartu vrijeme BPP i kompaktni ASG pristup`, async ({ page, isMobile }) => {
    await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    if (isMobile) {
      const toggle = page.locator('#menuToggle');
      await expect(toggle).toBeVisible({ timeout: 15000 });
      await toggle.click();
      await expect(page.locator('#navLinks')).toHaveClass(/open/);
      await toggle.click();
    }
    await expect(page.locator('#global-network')).toBeVisible({ timeout: 15000 });
    const panel = page.locator('#networkOverviewVisual');
    await expect(panel).toBeVisible({ timeout: 15000 });
    await expect(panel.locator('h3')).toContainText(route.panelTitle);
    await expect(panel.locator('.network-overview-kpis strong').nth(0)).toContainText('33');
    await expect(panel.locator('.network-overview-kpis strong').nth(1)).toContainText('+12');
    await expect(panel.locator('.network-overview-kpis strong').nth(2)).toContainText('45');
    await expect.poll(async () => page.evaluate(() => {
      const panel = document.getElementById('networkOverviewVisual');
      const dock = document.getElementById('networkLocationContext');
      const mapSlot = panel && panel.querySelector('#overviewMapSlot');
      const weatherSlot = panel && panel.querySelector('#overviewWeatherSlot');
      const map = document.getElementById('googleLocationMap');
      const weather = document.getElementById('locationWeatherPanel');
      return Boolean(panel && dock && mapSlot && weatherSlot && map && weather && mapSlot.contains(map) && weatherSlot.contains(weather));
    }), { timeout: 15000 }).toBe(true);
    await expect(page.locator('#googleLocationMap')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#locationWeatherPanel')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#bppPublicCard')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#bppPublicCard h3')).toContainText(route.bpp);
    const bppBox = await page.locator('#bppPublicCard').boundingBox();
    expect(bppBox).not.toBeNull();
    expect(bppBox.height).toBeLessThanOrEqual(185);
    await expect(page.locator('#bppPublicCard .bpp-share-btn')).toBeVisible();
    await expect(page.locator('#bppPublicCard .bpp-copy-btn')).toBeVisible();
    await expect(page.locator('#aiFab')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#aiFab .ai-fab-mark')).toContainText('ASG');
  });
}

test('početna stranica koristi trajne LinkedIn kartice za kontrolirane sekcije', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#digital-assets')).toBeVisible({ timeout: 15000 });
  await expect.poll(async () => page.evaluate(() => {
    const control = document.querySelector('#digital-assets .gnk-content-share');
    const link = control && control.querySelector('a[href*="linkedin.com/sharing/share-offsite"]');
    return link ? decodeURIComponent(link.href).includes('/podijeli/trzista-kartica/') : false;
  }), { timeout: 15000 }).toBe(true);
  await expect.poll(async () => page.evaluate(() => {
    const control = document.querySelector('#networkOverviewVisual .network-overview-share');
    const link = control && control.querySelector('a[href*="linkedin.com/sharing/share-offsite"]');
    return link ? decodeURIComponent(link.href).includes('/podijeli/grupa-kartica/') : false;
  }), { timeout: 15000 }).toBe(true);
  expect(await page.locator('a[href$="/trzista/"]').count()).toBeGreaterThan(0);
});