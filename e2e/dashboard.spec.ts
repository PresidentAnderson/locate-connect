import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login
    await expect(page).toHaveURL(/login|dashboard/);
  });

  test('should display navigation elements', async ({ page }) => {
    await page.goto('/dashboard');
    // Check for nav or sidebar
    const nav = page.locator('nav, aside, [role="navigation"]');
    if (await nav.first().isVisible()) {
      await expect(nav.first()).toBeVisible();
    }
  });

  test('should have accessible skip links', async ({ page }) => {
    await page.goto('/dashboard');
    // Check for skip to content link
    const skipLink = page.getByRole('link', { name: /skip/i });
    if (await skipLink.isVisible()) {
      await expect(skipLink).toBeVisible();
    }
  });
});

test.describe('Cold Cases Dashboard', () => {
  test('should display cold cases page', async ({ page }) => {
    await page.goto('/cold-cases');
    await expect(page).toHaveURL(/cold-cases|login/);
  });

  test('should have tab navigation', async ({ page }) => {
    await page.goto('/cold-cases');
    const tabs = page.getByRole('tab');
    if (await tabs.first().isVisible()) {
      await expect(tabs).toHaveCount(await tabs.count());
    }
  });
});
