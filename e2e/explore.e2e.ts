import { test, expect } from '@playwright/test'

// Requires:
//   - admin@example.com / adminpass123 seeded
//   - analyst@example.com / password123 seeded

async function loginAsAdmin(page: any) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('admin@example.com')
  await page.getByLabel(/password/i).fill('adminpass123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL('/')
}

async function loginAsAnalyst(page: any) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('analyst@example.com')
  await page.getByLabel(/password/i).fill('password123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL('/')
}

async function deleteConnectionIfExists(page: any, name: string) {
  const row = page.getByRole('row', { name: new RegExp(name, 'i') })
  if (await row.isVisible().catch(() => false)) {
    page.once('dialog', (d: any) => d.accept())
    await row.getByRole('button', { name: /delete/i }).click()
    await expect(page.getByText(name)).not.toBeVisible()
  }
}

async function setupConnections(page: any) {
  await loginAsAdmin(page)
  await page.goto('/settings/connections')

  // Clean then create — always start from a known state
  await deleteConnectionIfExists(page, 'e2e-sf')
  await deleteConnectionIfExists(page, 'e2e-cl')

  await page.getByRole('button', { name: /add connection/i }).click()
  await page.getByLabel(/^name$/i).fill('e2e-sf')
  await page.getByLabel(/type/i).selectOption('snowflake')
  await page.getByLabel(/account/i).fill('xy12345')
  await page.getByLabel(/username/i).fill('svc')
  await page.getByLabel(/private key/i).fill('-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----')
  await page.getByLabel(/warehouse/i).fill('WH')
  await page.getByLabel(/database/i).fill('DB')
  await page.getByLabel(/^schema$/i).fill('PUBLIC')
  await page.getByRole('button', { name: /save/i }).click()
  await expect(page.getByText('e2e-sf').first()).toBeVisible()

  await page.getByRole('button', { name: /add connection/i }).click()
  await page.getByLabel(/^name$/i).fill('e2e-cl')
  await page.getByLabel(/type/i).selectOption('claude')
  await page.getByLabel(/api key/i).fill('sk-ant-test')
  await page.getByLabel(/model/i).selectOption('claude-sonnet-4-6')
  await page.getByRole('button', { name: /save/i }).click()
  await expect(page.getByText('e2e-cl').first()).toBeVisible()
}

async function teardownConnections(page: any) {
  await page.goto('/settings/connections')
  await deleteConnectionIfExists(page, 'e2e-sf')
  await deleteConnectionIfExists(page, 'e2e-cl')
}

test.describe('Explore — session-start selector', () => {
  test('analyst sees session-start modal at /explore', async ({ page }) => {
    await setupConnections(page)
    await loginAsAnalyst(page)
    await page.goto('/explore')
    await expect(page.getByRole('heading', { name: /new session/i })).toBeVisible()
    await expect(page.getByLabel(/snowflake connection/i)).toBeVisible()
    await expect(page.getByLabel(/claude model/i)).toBeVisible()
  })

  test('analyst selects both connections and starts session', async ({ page }) => {
    await setupConnections(page)
    await loginAsAnalyst(page)
    await page.goto('/explore')

    await expect(page.getByLabel(/snowflake connection/i)).toBeVisible()
    await page.getByLabel(/snowflake connection/i).selectOption({ label: 'e2e-sf' })
    await page.getByLabel(/claude model/i).selectOption({ label: 'e2e-cl' })
    await page.getByRole('button', { name: /start session/i }).click()

    await expect(page.getByRole('heading', { name: /explore/i })).toBeVisible()
  })

  test('analyst with no connections sees helpful message', async ({ page }) => {
    await loginAsAdmin(page)
    await teardownConnections(page)
    await loginAsAnalyst(page)
    await page.goto('/explore')
    await expect(page.getByRole('heading', { name: /new session/i })).toBeVisible()
    await expect(page.getByText(/no snowflake connections available/i)).toBeVisible()
  })
})
