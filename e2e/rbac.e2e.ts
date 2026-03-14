import { test, expect } from '@playwright/test'

// Requires:
//   - ai-dash-backend running on http://localhost:8000
//   - seeded users:
//       analyst@example.com / password123 (Role.analyst)
//       admin@example.com   / adminpass123  (Role.admin)

// Helper: SPA-navigate without a full page reload (preserves React in-memory token)
async function spaNavigate(page: import('@playwright/test').Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p)
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }))
  }, path)
}

test.describe('RBAC — analyst', () => {
  test('analyst navigating to /admin sees 403 page with no admin nav items', async ({ page }) => {
    // Arrange — log in as analyst
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('analyst@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/')
    // Act — navigate within SPA to /admin (no page reload, token preserved)
    await spaNavigate(page, '/admin')
    // Assert — 403 page shown
    await expect(page.getByRole('heading', { name: /403/i })).toBeVisible()
    // Assert — admin nav item is absent
    await expect(page.getByRole('link', { name: /admin/i })).not.toBeVisible()
  })
})

test.describe('RBAC — admin', () => {
  test('admin can access /admin and sees admin nav item', async ({ page }) => {
    // Arrange — log in as admin
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('admin@example.com')
    await page.getByLabel(/password/i).fill('adminpass123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/')
    // Assert — admin nav link is visible on home page
    await expect(page.getByRole('link', { name: /admin/i })).toBeVisible()
    // Act — click the admin nav link (SPA navigation)
    await page.getByRole('link', { name: /admin/i }).click()
    // Assert — admin page loads normally (no 403 heading)
    await expect(page.getByRole('heading', { name: /^admin$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /403/i })).not.toBeVisible()
  })
})
