import { test, expect } from '@playwright/test'

// Requires:
//   - ai-dash-backend running on http://localhost:8000
//   - admin@example.com / adminpass123 seeded

async function loginAsAdmin(page: any) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('admin@example.com')
  await page.getByLabel(/password/i).fill('adminpass123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL('/')
}

test.describe('Connections settings page', () => {
  test('admin can navigate to Settings page', async ({ page }) => {
    await loginAsAdmin(page)
    await page.getByRole('link', { name: /settings/i }).click()
    await expect(page).toHaveURL('/settings/connections')
    await expect(page.getByRole('heading', { name: /connections/i })).toBeVisible()
  })

  test('analyst cannot access Settings page — sees 403', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('analyst@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/')

    await page.goto('/settings/connections')
    await expect(page.getByRole('heading', { name: /403/i })).toBeVisible()
  })

  test('admin creates a Claude connection and it appears in the list', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/settings/connections')

    await page.getByRole('button', { name: /add connection/i }).click()
    await page.getByLabel(/^name$/i).fill('e2e-claude')
    await page.getByLabel(/type/i).selectOption('claude')
    await page.getByLabel(/api key/i).fill('sk-ant-test-key')
    await page.getByLabel(/model/i).selectOption('claude-sonnet-4-6')
    await page.getByRole('button', { name: /save/i }).click()

    await expect(page.getByText('e2e-claude').first()).toBeVisible()
  })

  test('admin deletes a connection and it disappears', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/settings/connections')

    // Create one to delete
    await page.getByRole('button', { name: /add connection/i }).click()
    await page.getByLabel(/^name$/i).fill('e2e-to-delete')
    await page.getByLabel(/type/i).selectOption('claude')
    await page.getByLabel(/api key/i).fill('sk-ant-test')
    await page.getByLabel(/model/i).selectOption('claude-sonnet-4-6')
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText('e2e-to-delete')).toBeVisible()

    // Delete it
    page.once('dialog', (dialog) => dialog.accept())
    const row = page.getByRole('row', { name: /e2e-to-delete/i })
    await row.getByRole('button', { name: /delete/i }).click()

    await expect(page.getByText('e2e-to-delete')).not.toBeVisible()
  })

  test('admin clicks Test on a connection and sees a result', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/settings/connections')

    // Create one to test
    await page.getByRole('button', { name: /add connection/i }).click()
    await page.getByLabel(/^name$/i).fill('e2e-test-conn')
    await page.getByLabel(/type/i).selectOption('claude')
    await page.getByLabel(/api key/i).fill('sk-ant-invalid') // will fail — that's fine
    await page.getByLabel(/model/i).selectOption('claude-sonnet-4-6')
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText('e2e-test-conn').first()).toBeVisible()

    const row = page.getByRole('row', { name: /e2e-test-conn/i }).first()
    await row.getByRole('button', { name: /^test$/i }).click()

    // Result appears (ok or error — either is a valid response from the real backend)
    await expect(row.getByText(/ok|error|timeout|invalid|authentication/i)).toBeVisible({ timeout: 15000 })
  })
})
