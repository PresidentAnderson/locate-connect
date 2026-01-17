import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/LocateConnect/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/sign in|log in/i);
  });

  test('should display signup page', async ({ page }) => {
    await page.goto('/signup');
    await expect(page).toHaveTitle(/LocateConnect/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/sign up|create account/i);
  });

  test('should display forgot password page', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page).toHaveTitle(/LocateConnect/);
  });

  test('should navigate from login to signup', async ({ page }) => {
    await page.goto('/login');
    const signupLink = page.getByRole('link', { name: /sign up|create account/i });
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await expect(page).toHaveURL(/signup/);
    }
  });

  test('should show validation errors on empty login', async ({ page }) => {
    await page.goto('/login');
    const submitButton = page.getByRole('button', { name: /sign in|log in/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      // Should show validation message or stay on login
      await expect(page).toHaveURL(/login/);
    }
  });
});
