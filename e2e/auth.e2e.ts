import { test, expect } from '@playwright/test'

// Requires:
//   - ai-dash-backend running on http://localhost:8000
//   - a seeded user: analyst@example.com / password123 (Role.analyst)

test.describe('Auth flows', () => {
  test('unauthenticated access to protected route redirects to login', async ({ page }) => {
    // Arrange / Act
    await page.goto('/')
    // Assert
    await expect(page).toHaveURL('/login')
  })

  test('successful login redirects to app home', async ({ page }) => {
    // Arrange
    await page.goto('/login')
    // Act
    await page.getByLabel(/email/i).fill('analyst@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    // Assert
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: /ai-dash/i })).toBeVisible()
  })

  test('failed login shows inline error and stays on login page', async ({ page }) => {
    // Arrange
    await page.goto('/login')
    // Act
    await page.getByLabel(/email/i).fill('analyst@example.com')
    await page.getByLabel(/password/i).fill('wrong-password')
    await page.getByRole('button', { name: /sign in/i }).click()
    // Assert
    await expect(page.getByRole('alert')).toContainText(/invalid email or password/i)
    await expect(page).toHaveURL('/login')
  })

  test('logout redirects to login and blocks protected routes', async ({ page }) => {
    // Arrange — log in first
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('analyst@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/')
    // Act — log out
    await page.getByRole('button', { name: /log out/i }).click()
    // Assert
    await expect(page).toHaveURL('/login')
    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })

  test('JWT is not accessible via document.cookie after login', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('admin@example.com')
    await page.getByLabel(/password/i).fill('adminpass123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/')
    const cookies = await page.evaluate(() => document.cookie)
    expect(cookies).not.toContain('access_token')
  })

  test('page reload after login preserves auth state', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('admin@example.com')
    await page.getByLabel(/password/i).fill('adminpass123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/')
    // Reload — cookie is httpOnly so it persists; /auth/me re-bootstraps state
    await page.reload()
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: /ai-dash/i })).toBeVisible()
  })
})
