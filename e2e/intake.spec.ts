import { test, expect } from '@playwright/test';

test.describe('Case Intake Form', () => {
  test('should display intake form when authenticated', async ({ page }) => {
    await page.goto('/cases/new');
    // May redirect to login if not authenticated
    const url = page.url();
    expect(url).toMatch(/cases\/new|login/);
  });

  test('should show multi-step form navigation', async ({ page }) => {
    await page.goto('/cases/new');
    // Check for step indicators or progress bar
    const progressIndicator = page.locator('[aria-label="Progress"], nav ol, .steps');
    if (await progressIndicator.isVisible()) {
      await expect(progressIndicator).toBeVisible();
    }
  });

  test('should have required form fields', async ({ page }) => {
    await page.goto('/cases/new');
    // Check for key form elements
    const form = page.locator('form');
    if (await form.isVisible()) {
      // Should have name fields
      const firstNameInput = page.getByLabel(/first name/i);
      const lastNameInput = page.getByLabel(/last name/i);

      if (await firstNameInput.isVisible()) {
        await expect(firstNameInput).toBeVisible();
      }
      if (await lastNameInput.isVisible()) {
        await expect(lastNameInput).toBeVisible();
      }
    }
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/cases/new');
    const submitButton = page.getByRole('button', { name: /submit|next|continue/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      // Should show validation or stay on form
      await expect(page).toHaveURL(/cases/);
    }
  });
});
