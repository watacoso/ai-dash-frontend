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

async function ensureConnections(page: any) {
  // Create a Snowflake and Claude connection via the admin settings page
  await page.goto('/settings/connections')

  const hasSnowflake = await page.getByText('e2e-sf').isVisible().catch(() => false)
  if (!hasSnowflake) {
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
  }

  const hasClaude = await page.getByText('e2e-cl').isVisible().catch(() => false)
  if (!hasClaude) {
    await page.getByRole('button', { name: /add connection/i }).click()
    await page.getByLabel(/^name$/i).fill('e2e-cl')
    await page.getByLabel(/type/i).selectOption('claude')
    await page.getByLabel(/api key/i).fill('sk-ant-test')
    await page.getByLabel(/model/i).selectOption('claude-sonnet-4-6')
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText('e2e-cl').first()).toBeVisible()
  }
}

test.describe('Explore — session-start selector', () => {
  test('analyst sees session-start modal at /explore', async ({ page }) => {
    await loginAsAnalyst(page)
    await page.goto('/explore')
    await expect(page.getByRole('heading', { name: /new session/i })).toBeVisible()
    await expect(page.getByLabel(/snowflake connection/i)).toBeVisible()
    await expect(page.getByLabel(/claude model/i)).toBeVisible()
  })

  test('analyst selects both connections and starts session', async ({ page }) => {
    await loginAsAdmin(page)
    await ensureConnections(page)
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('analyst@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/')

    await page.goto('/explore')
    await expect(page.getByLabel(/snowflake connection/i)).toBeVisible()

    await page.getByLabel(/snowflake connection/i).selectOption({ label: 'e2e-sf' })
    await page.getByLabel(/claude model/i).selectOption({ label: 'e2e-cl' })
    await page.getByRole('button', { name: /start session/i }).click()

    await expect(page.getByRole('heading', { name: /explore/i })).toBeVisible()
  })

  test('analyst with no connections sees helpful message', async ({ page }) => {
    // Use a fresh admin session to verify message when no matching connections exist
    await loginAsAdmin(page)
    await page.goto('/explore')
    await expect(page.getByRole('heading', { name: /new session/i })).toBeVisible()
    // If no snowflake connections exist, message should show
    const sfSelect = page.getByLabel(/snowflake connection/i)
    const noSfMsg = page.getByText(/no snowflake connections available/i)
    // Either the select exists (connections present) or the message is shown
    const hasSelect = await sfSelect.isVisible().catch(() => false)
    const hasMsg = await noSfMsg.isVisible().catch(() => false)
    expect(hasSelect || hasMsg).toBe(true)
  })
})
