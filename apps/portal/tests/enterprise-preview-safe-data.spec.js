const { test, expect } = require('@playwright/test');

test('Enterprise dashboard exposes preview-safe data layer in browser UI', async ({ page }) => {
  await page.goto('/enterprise/');

  await expect(page.locator('body')).toHaveAttribute('data-preview-safe-contract', 'GNK_ENTERPRISE_PREVIEW_SAFE_STATE_V1');
  await expect(page.locator('[data-preview-safe-state]')).toBeVisible();
  await expect(page.locator('[data-preview-contract]')).toContainText('GNK_ENTERPRISE_PREVIEW_SAFE_STATE_V1');
  await expect(page.locator('[data-preview-mode]')).toContainText('review-only');

  await expect(page.locator('body')).toHaveAttribute('data-preview-safe-runtime', 'loaded');
  await expect(page.locator('[data-preview-module]')).toHaveCount(8);
  await expect(page.locator('[data-preview-module="project-center"]')).toContainText('19 records');
  await expect(page.locator('[data-preview-module="digital-workforce"]')).toContainText('1537 records');

  const locks = page.locator('[data-preview-locks]');
  await expect(locks).toContainText('production');
  await expect(locks).toContainText('mass-email');
  await expect(locks).toContainText('dns');
  await expect(locks).toContainText('secrets');
  await expect(locks).toContainText('payments');
  await expect(locks).toContainText('cloudflare-routes');
});
