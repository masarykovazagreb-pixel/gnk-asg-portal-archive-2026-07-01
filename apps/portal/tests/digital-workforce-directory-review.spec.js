const { test, expect } = require('@playwright/test');

test('Digital Workforce directory renders 1,537 generated profiles in review mode', async ({ page }) => {
  await page.goto('/digital-workforce/directory/');

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('body')).toHaveAttribute('data-review-expected-profiles', '1537');
  await expect(page.locator('body')).toHaveAttribute('data-review-runtime', 'loaded');
  await expect(page.locator('body')).toHaveAttribute('data-review-loaded-profiles', '1537');
  await expect(page.locator('[data-review-disclosure]')).toContainText('system-generated operational profiles');
  await expect(page.locator('[data-browser-evidence]')).toBeVisible();
  await expect(page.locator('[data-profile-total]')).toContainText('1,537');
  await expect(page.locator('#loadedProfiles')).toContainText('1,537');
  await expect(page.locator('[data-review-profile-row]')).toHaveCount(50);
  await expect(page.locator('#resultSummary')).toContainText('Showing 1–50 of 1,537 profiles.');

  await page.locator('#query').fill('Mission Control');
  await expect(page.locator('#resultSummary')).toContainText('profiles');
  await expect(page.locator('[data-review-profile-row]').first()).toContainText('Mission Control');

  await page.locator('#reset').click();
  await expect(page.locator('#matched')).toContainText('1,537');
});
