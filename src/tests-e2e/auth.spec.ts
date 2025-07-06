import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('should allow a user to log in successfully', async ({ page }) => {
    // Navigate to the login page
    await page.goto('/login');

    // TODO: Use environment variables for test credentials
    const testUserEmail = process.env.TEST_USER_EMAIL || 'testuser@example.com';
    const testUserPassword = process.env.TEST_USER_PASSWORD || 'password123';

    // Fill in the email field
    // Assuming standard input types. Prefer data-testid or aria-label in a real app.
    await page.locator('input[type="email"]').fill(testUserEmail);

    // Fill in the password field
    await page.locator('input[type="password"]').fill(testUserPassword);

    // Click the login button
    // Assuming a standard submit button. Prefer data-testid or specific role/text.
    // This selector tries to find a button with type="submit" and text "Login" (case-insensitive) or just text "Login" or "Sign In"
    await page.locator('button[type="submit"]:text-matches("Login", "i"), button:text-matches("Login", "i"), button:text-matches("Sign In", "i")').first().click();

    // Wait for navigation to a dashboard page (example URL)
    // Adjust the URL to match the actual dashboard URL after login
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 10000 }); // Increased timeout for navigation

    // (Optional) Verify that some element indicating a successful login is visible
    // For example, a logout button or user profile element.
    // await expect(page.locator('text=Logout')).toBeVisible();
    // await expect(page.getByRole('button', { name: /logout/i })).toBeVisible();

    // Add a console log for successful test execution in this example
    console.log(`Test 'should allow a user to log in successfully' passed. User redirected to: ${page.url()}`);
  });

  // TODO: Add test for failed login (e.g., wrong password)
  // test('should show an error message for invalid credentials', async ({ page }) => {
  //   await page.goto('/login');
  //   await page.locator('input[type="email"]').fill('wrong@example.com');
  //   await page.locator('input[type="password"]').fill('wrongpassword');
  //   await page.locator('button[type="submit"]').click();
  //   const errorMessage = page.locator('.error-message-class'); // Replace with actual error selector
  //   await expect(errorMessage).toBeVisible();
  //   await expect(errorMessage).toContainText('Invalid login attempt'); // Replace with actual error text
  // });
});
