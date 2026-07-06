import { test, expect } from '@playwright/test';

test.describe('EN index public layer clean review contract', () => {
  test('renders official GNK identity, financials, code show, workers and posts', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173/en/');

    await expect(page).toHaveTitle(/GNK ASG d\.o\.o\..*GNK DINAMO Ltd\. Group/);
    await expect(page.locator('body')).toContainText('Financial results are visible on the index.');
    await expect(page.locator('body')).toContainText('GNK ASG d.o.o. + GNK DINAMO Ltd. Group.');
    await expect(page.locator('#gnk-index-code-show')).toBeVisible();
    await expect(page.locator('#workers')).toBeVisible();
    await expect(page.locator('#posts')).toBeVisible();

    await expect(page.locator('img[src="/assets/brand/media-kit/GNK_ASG_logo_gold_transparent.png"]')).toHaveCount(3);
    await expect(page.locator('img[src="/assets/brand/media-kit/GNK_DINAMO_Ltd_logo_gold_transparent.png"]')).toHaveCount(2);
    await expect(page.locator('svg.brand-mark')).toHaveCount(0);

    await expect(page.locator('.fin-card')).toHaveCount(4);
    await expect(page.locator('.route-card')).toHaveCount(8);
    await expect(page.locator('#posts .card')).toHaveCount(3);
  });
});
