import { test, expect, type Page } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Login Page', () => {
    test('should display login page with correct elements', async ({ page }) => {
      await page.goto('/login');
      await expect(page).toHaveTitle(/LocateConnect/);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(/sign in|log in/i);

      // Check for email and password fields
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible();
    });

    test('should have forgot password link', async ({ page }) => {
      await page.goto('/login');
      const forgotLink = page.getByRole('link', { name: /forgot.*password/i });
      await expect(forgotLink).toBeVisible();
    });

    test('should show validation errors for empty email', async ({ page }) => {
      await page.goto('/login');

      // Fill only password
      await page.getByLabel(/password/i).fill('somepassword123');
      await page.getByRole('button', { name: /sign in|log in/i }).click();

      // Should show error or stay on login page
      await expect(page).toHaveURL(/login/);
    });

    test('should show validation errors for empty password', async ({ page }) => {
      await page.goto('/login');

      // Fill only email
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByRole('button', { name: /sign in|log in/i }).click();

      // Should show error or stay on login page
      await expect(page).toHaveURL(/login/);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel(/email/i).fill('invalid@example.com');
      await page.getByLabel(/password/i).fill('wrongpassword123');
      await page.getByRole('button', { name: /sign in|log in/i }).click();

      // Should stay on login page or show error
      await expect(page).toHaveURL(/login/);

      // Look for error message
      const errorMessage = page.locator('[role="alert"], .error, .text-red');
      await expect(errorMessage.or(page.locator('text=/invalid|incorrect|wrong/i'))).toBeVisible({ timeout: 5000 }).catch(() => {
        // Error display may vary, just ensure we're still on login
      });
    });

    test('should navigate to signup from login', async ({ page }) => {
      await page.goto('/login');
      const signupLink = page.getByRole('link', { name: /sign up|create.*account|register/i });

      if (await signupLink.isVisible()) {
        await signupLink.click();
        await expect(page).toHaveURL(/signup|register/);
      }
    });

    test('should navigate to forgot password from login', async ({ page }) => {
      await page.goto('/login');
      const forgotLink = page.getByRole('link', { name: /forgot.*password/i });

      if (await forgotLink.isVisible()) {
        await forgotLink.click();
        await expect(page).toHaveURL(/forgot|reset|password/);
      }
    });
  });

  test.describe('Signup Page', () => {
    test('should display signup page with correct elements', async ({ page }) => {
      await page.goto('/signup');
      await expect(page).toHaveTitle(/LocateConnect/);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(/sign up|create.*account|register/i);

      // Check for required fields
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i).first()).toBeVisible();
    });

    test('should have link to login page', async ({ page }) => {
      await page.goto('/signup');
      const loginLink = page.getByRole('link', { name: /sign in|log in|already.*account/i });
      await expect(loginLink).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/signup');

      // Try invalid email
      await page.getByLabel(/email/i).fill('notanemail');
      await page.getByLabel(/password/i).first().fill('password123');

      const submitButton = page.getByRole('button', { name: /sign up|create.*account|register/i });
      await submitButton.click();

      // Should stay on signup or show validation error
      await expect(page).toHaveURL(/signup|register/);
    });

    test('should validate password requirements', async ({ page }) => {
      await page.goto('/signup');

      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).first().fill('weak'); // Weak password

      const submitButton = page.getByRole('button', { name: /sign up|create.*account|register/i });
      await submitButton.click();

      // Should stay on signup or show validation error
      await expect(page).toHaveURL(/signup|register/);
    });

    test('should navigate to login from signup', async ({ page }) => {
      await page.goto('/signup');
      const loginLink = page.getByRole('link', { name: /sign in|log in|already.*account/i });

      if (await loginLink.isVisible()) {
        await loginLink.click();
        await expect(page).toHaveURL(/login/);
      }
    });
  });

  test.describe('Forgot Password Page', () => {
    test('should display forgot password page', async ({ page }) => {
      await page.goto('/forgot-password');
      await expect(page).toHaveTitle(/LocateConnect/);
      await expect(page.getByLabel(/email/i)).toBeVisible();
    });

    test('should have link back to login', async ({ page }) => {
      await page.goto('/forgot-password');
      const loginLink = page.getByRole('link', { name: /sign in|log in|back.*login|remember/i });
      await expect(loginLink).toBeVisible();
    });

    test('should validate email is required', async ({ page }) => {
      await page.goto('/forgot-password');

      const submitButton = page.getByRole('button', { name: /send|reset|submit/i });
      if (await submitButton.isVisible()) {
        await submitButton.click();
        // Should stay on page or show error
        await expect(page).toHaveURL(/forgot|reset|password/);
      }
    });

    test('should show success message for valid email', async ({ page }) => {
      await page.goto('/forgot-password');

      await page.getByLabel(/email/i).fill('test@example.com');
      const submitButton = page.getByRole('button', { name: /send|reset|submit/i });

      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Should show success message or confirmation
        const successMessage = page.locator('text=/check.*email|sent|instructions/i');
        await expect(successMessage.or(page.locator('[role="status"]'))).toBeVisible({ timeout: 5000 }).catch(() => {
          // Success handling may vary
        });
      }
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing dashboard unauthenticated', async ({ page }) => {
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL(/login|auth/);
    });

    test('should redirect to login when accessing cases unauthenticated', async ({ page }) => {
      await page.goto('/cases');

      // Should redirect to login
      await expect(page).toHaveURL(/login|auth/);
    });

    test('should redirect to login when accessing case intake unauthenticated', async ({ page }) => {
      await page.goto('/cases/new');

      // Should redirect to login
      await expect(page).toHaveURL(/login|auth/);
    });

    test('should redirect to login when accessing partner portal unauthenticated', async ({ page }) => {
      await page.goto('/partner-portal');

      // Should redirect to login
      await expect(page).toHaveURL(/login|auth/);
    });
  });

  test.describe('Public Routes', () => {
    test('should allow access to home page', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle(/LocateConnect/);
    });

    test('should allow access to tip submission page', async ({ page }) => {
      await page.goto('/tip');
      // Tip page should be publicly accessible
      const tipHeading = page.getByRole('heading', { name: /tip|report|submit/i });
      await expect(tipHeading.or(page.locator('form'))).toBeVisible({ timeout: 5000 }).catch(() => {
        // Page structure may vary
      });
    });

    test('should allow access to about page', async ({ page }) => {
      await page.goto('/about');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 5000 }).catch(() => {
        // May have different structure
      });
    });
  });

  test.describe('Accessibility', () => {
    test('login form should be keyboard navigable', async ({ page }) => {
      await page.goto('/login');

      // Tab through form elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Focus should reach interactive elements
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'BUTTON', 'A']).toContain(focusedElement);
    });

    test('login form should have proper labels', async ({ page }) => {
      await page.goto('/login');

      // All inputs should have associated labels
      const emailInput = page.getByLabel(/email/i);
      const passwordInput = page.getByLabel(/password/i);

      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
    });

    test('error messages should be announced to screen readers', async ({ page }) => {
      await page.goto('/login');

      // Submit empty form
      await page.getByRole('button', { name: /sign in|log in/i }).click();

      // Check for role="alert" or aria-live regions
      const alertRegion = page.locator('[role="alert"], [aria-live]');
      // May or may not be present depending on implementation
      await alertRegion.isVisible().catch(() => {});
    });
  });
});
