import { test, expect } from '@playwright/test';

test('landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /get started/i })).toBeVisible();
  await expect(page.getByText(/save smarter/i)).toBeVisible();
});
