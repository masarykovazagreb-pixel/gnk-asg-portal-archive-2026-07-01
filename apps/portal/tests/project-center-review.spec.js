const { test, expect } = require('@playwright/test');

test('Project Center renders the 19-record recovery review UI', async ({ page }) => {
  await page.goto('/enterprise/project-center/');

  await expect(page.locator('[data-review-disclosure]')).toBeVisible();
  await expect(page.locator('[data-browser-evidence]')).toBeVisible();
  await expect(page.locator('[data-review-project-card]')).toHaveCount(19);
  await expect(page.locator('[data-project-total]')).toContainText('19');

  await expect(page.locator('body')).toHaveAttribute('data-review-expected-projects', '19');
  await expect(page.locator('[data-review-project-card][data-source="sport-education"]')).toHaveCount(8);
  await expect(page.locator('[data-review-project-card][data-source="technology-intelligence"]')).toHaveCount(7);
  await expect(page.locator('[data-review-project-card][data-source="industry"]')).toHaveCount(4);

  await expect(page.getByText('THE CODE')).toBeVisible();
  await expect(page.getByText('Enterprise Project and Module Generator')).toBeVisible();
  await expect(page.getByText('International Factory Development Programme')).toBeVisible();
});
