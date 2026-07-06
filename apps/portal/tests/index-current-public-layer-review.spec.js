const { test, expect } = require('@playwright/test');

test('English index keeps the current public layer and review evidence visible', async ({ page }) => {
  await page.goto('/en/');

  await expect(page.getByRole('heading', { name: /Financial results are visible on the index/i })).toBeVisible();
  await expect(page.getByText('THE CODE', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('9 projects in progress')).toBeVisible();
  await expect(page.getByText('19 portfolio records')).toBeVisible();
  await expect(page.getByText('1,537 generated workflow profiles', { exact: false })).toBeVisible();
  await expect(page.getByText(/Public workers/i).first()).toBeVisible();
  await expect(page.getByText(/Posts/i).first()).toBeVisible();

  await expect(page.locator('svg.brand-mark')).toHaveCount(0);
  await expect(page.locator('img[src*="GNK_ASG_logo_gold_transparent.png"]')).toHaveCount(2);
  await expect(page.locator('img[src*="GNK_DINAMO_Ltd_logo_gold_transparent.png"]')).toHaveCount(2);

  const asgAsset = await page.request.get('/assets/brand/official-gnk-asg-gold.svg');
  expect(asgAsset.ok()).toBeTruthy();
  const dinamoAsset = await page.request.get('/assets/brand/official-gnk-dinamo-ltd-group-gold.svg');
  expect(dinamoAsset.ok()).toBeTruthy();
});
