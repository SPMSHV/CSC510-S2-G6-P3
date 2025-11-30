import { test, expect } from '@playwright/test';

test('home page loads and shows navbar/brand', async ({ page }) => {
  await page.goto('/'); // baseURL from config
  // Scope to the <nav> landmark so we only match the navbar brand link
  await expect(
    page.getByRole('navigation').getByRole('link', { name: /bitecode/i })
  ).toBeVisible();
});
