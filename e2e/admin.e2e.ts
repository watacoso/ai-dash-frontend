import { test, expect } from '@playwright/test'

// Requires:
//   - ai-dash-backend running on http://localhost:8000
//   - seeded users:
//       analyst@example.com / password123 (Role.analyst)
//       admin@example.com   / adminpass123  (Role.admin)

async function loginAs(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL('/')
}

async function spaNavigate(page: import('@playwright/test').Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p)
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }))
  }, path)
}

test.describe('Admin — user management', () => {
  test('admin generates invite, new user accepts and can log in', async ({ page }) => {
    await loginAs(page, 'admin@example.com', 'adminpass123')
    await spaNavigate(page, '/admin')
    await expect(page.getByRole('heading', { name: /^admin$/i })).toBeVisible()

    // Open invite modal
    await page.getByRole('button', { name: /invite user/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Generate invite with analyst role
    await page.getByRole('button', { name: /generate invite/i }).click()

    // Grab the invite URL from the modal
    const inviteText = await page.locator('.invite-url').textContent()
    expect(inviteText).toContain('/accept-invite?token=')
    const inviteUrl = inviteText!
    const token = new URL(inviteUrl).searchParams.get('token')!

    // Close modal
    await page.getByRole('button', { name: /close/i }).click()

    // Accept invite via API directly (no accept-invite page in this ticket)
    const res = await page.request.post('http://localhost:8000/admin/users/accept-invite', {
      data: { token, email: 'newuser@example.com', name: 'New User', password: 'newpass123' },
    })
    expect(res.status()).toBe(201)

    // New user can log in
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('newuser@example.com')
    await page.getByLabel(/password/i).fill('newpass123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/')
  })

  test('admin changes analyst role to admin', async ({ page }) => {
    await loginAs(page, 'admin@example.com', 'adminpass123')
    await spaNavigate(page, '/admin')
    await expect(page.getByRole('heading', { name: /^admin$/i })).toBeVisible()

    // Find newuser row (created in previous test as analyst) and change role
    const newUserRow = page.getByRole('row').filter({ hasText: 'newuser@example.com' })
    await newUserRow.getByRole('combobox').selectOption('admin')

    // Row should now show admin
    await expect(newUserRow.getByRole('combobox')).toHaveValue('admin')
  })

  test('admin deactivates a user', async ({ page }) => {
    await loginAs(page, 'admin@example.com', 'adminpass123')
    await spaNavigate(page, '/admin')
    await expect(page.getByRole('heading', { name: /^admin$/i })).toBeVisible()

    // Deactivate newuser (created in first test) — avoids polluting shared analyst seed
    const newUserRow = page.getByRole('row').filter({ hasText: 'newuser@example.com' })
    await newUserRow.getByRole('button', { name: /deactivate/i }).click()

    // Row should now show inactive
    await expect(newUserRow.getByText('inactive')).toBeVisible()
  })
})
