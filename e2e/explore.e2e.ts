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
  await page.waitForLoadState('networkidle')

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
  await page.waitForLoadState('networkidle')
  await deleteConnectionIfExists(page, 'e2e-sf')
  await deleteConnectionIfExists(page, 'e2e-cl')
}

async function setupLiveConnections(page: any) {
  await loginAsAdmin(page)
  await page.goto('/settings/connections')
  await page.waitForLoadState('networkidle')

  await deleteConnectionIfExists(page, 'e2e-sf-live')
  await deleteConnectionIfExists(page, 'e2e-cl-live')

  await page.getByRole('button', { name: /add connection/i }).click()
  await page.getByLabel(/^name$/i).fill('e2e-sf-live')
  await page.getByLabel(/type/i).selectOption('snowflake')
  await page.getByLabel(/account/i).fill(process.env.E2E_SF_ACCOUNT!)
  await page.getByLabel(/username/i).fill(process.env.E2E_SF_USERNAME!)
  await page.getByLabel(/private key/i).fill(process.env.E2E_SF_PRIVATE_KEY!)
  await page.getByLabel(/warehouse/i).fill(process.env.E2E_SF_WAREHOUSE!)
  await page.getByLabel(/database/i).fill(process.env.E2E_SF_DATABASE!)
  if (process.env.E2E_SF_PASSPHRASE) {
    await page.getByLabel(/passphrase/i).fill(process.env.E2E_SF_PASSPHRASE)
  }
  await page.getByRole('button', { name: /save/i }).click()
  await expect(page.getByText('e2e-sf-live').first()).toBeVisible()

  await page.getByRole('button', { name: /add connection/i }).click()
  await page.getByLabel(/^name$/i).fill('e2e-cl-live')
  await page.getByLabel(/type/i).selectOption('claude')
  await page.getByLabel(/api key/i).fill(process.env.E2E_CL_API_KEY!)
  await page.getByLabel(/model/i).selectOption(process.env.E2E_CL_MODEL || 'claude-sonnet-4-6')
  await page.getByRole('button', { name: /save/i }).click()
  await expect(page.getByText('e2e-cl-live').first()).toBeVisible()
}

async function teardownLiveConnections(page: any) {
  await page.goto('/settings/connections')
  await page.waitForLoadState('networkidle')
  await deleteConnectionIfExists(page, 'e2e-sf-live')
  await deleteConnectionIfExists(page, 'e2e-cl-live')
}

// ── Live chat tests (requires .env.e2e with real Snowflake + Claude credentials) ──

test.describe('Explore — live chat', () => {
  test.setTimeout(120_000) // Snowflake + Claude round trips can take >30s

  test.beforeEach(async ({ page }) => {
    test.skip(
      !process.env.E2E_SF_ACCOUNT,
      'Live Snowflake credentials not set — add them to .env.e2e to run this test'
    )
    await setupLiveConnections(page)
  })

  test.afterEach(async ({ page }) => {
    await loginAsAdmin(page)
    await teardownLiveConnections(page)
  })

  test('analyst sends a message and receives a non-empty AI response', async ({ page }) => {
    await loginAsAnalyst(page)
    await page.goto('/explore')

    await page.getByLabel(/snowflake connection/i).selectOption({ label: 'e2e-sf-live' })
    await page.getByLabel(/claude model/i).selectOption({ label: 'e2e-cl-live' })
    await page.getByRole('button', { name: /start session/i }).click()

    await expect(page.getByRole('heading', { name: /explore/i })).toBeVisible()

    await page.getByPlaceholder(/ask about your data/i).fill('what databases are available?')
    await page.getByRole('button', { name: /send/i }).click()

    // Wait for the AI response bubble — Snowflake + Claude round trip can take >30s
    await expect(
      page.locator('.chat-bubble[data-role="assistant"]').first()
    ).not.toBeEmpty({ timeout: 90000 })
  })

  test('analyst can ask about schemas and gets schema list', async ({ page }) => {
    await loginAsAnalyst(page)
    await page.goto('/explore')

    await page.getByLabel(/snowflake connection/i).selectOption({ label: 'e2e-sf-live' })
    await page.getByLabel(/claude model/i).selectOption({ label: 'e2e-cl-live' })
    await page.getByRole('button', { name: /start session/i }).click()

    // First message
    await page.getByPlaceholder(/ask about your data/i).fill('what databases are available?')
    await page.getByRole('button', { name: /send/i }).click()
    await expect(
      page.locator('.chat-bubble[data-role="assistant"]').first()
    ).not.toBeEmpty({ timeout: 90000 })

    // Second message — verify history is maintained
    await page.getByPlaceholder(/ask about your data/i).fill('what schemas are in my database?')
    await page.getByRole('button', { name: /send/i }).click()
    await expect(
      page.locator('.chat-bubble[data-role="assistant"]').nth(1)
    ).not.toBeEmpty({ timeout: 90000 })
  })
})

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

// ── Autocomplete tests (requires .env.e2e with real Snowflake credentials) ──

test.describe('Explore — autocomplete', () => {
  test.beforeEach(async ({ page }) => {
    await setupLiveConnections(page)
  })

  test.afterEach(async ({ page }) => {
    await loginAsAdmin(page)
    await teardownLiveConnections(page)
  })

  test('dropdown appears when data: is typed in chat input', async ({ page }) => {
    await loginAsAnalyst(page)
    await page.goto('/explore')

    await page.getByLabel(/snowflake connection/i).selectOption({ label: 'e2e-sf-live' })
    await page.getByLabel(/claude model/i).selectOption({ label: 'e2e-cl-live' })
    await page.getByRole('button', { name: /start session/i }).click()
    await expect(page.getByRole('heading', { name: /explore/i })).toBeVisible()

    await page.getByPlaceholder(/ask about your data/i).fill('data:')
    await expect(page.getByRole('listbox')).toBeVisible({ timeout: 5000 })
  })

  test('Tab inserts selected suggestion and closes dropdown', async ({ page }) => {
    await loginAsAnalyst(page)
    await page.goto('/explore')

    await page.getByLabel(/snowflake connection/i).selectOption({ label: 'e2e-sf-live' })
    await page.getByLabel(/claude model/i).selectOption({ label: 'e2e-cl-live' })
    await page.getByRole('button', { name: /start session/i }).click()

    const input = page.getByPlaceholder(/ask about your data/i)
    await input.fill('data:')
    await expect(page.getByRole('listbox')).toBeVisible({ timeout: 5000 })

    await input.press('Tab')
    await expect(page.getByRole('listbox')).not.toBeVisible()
    const value = await input.inputValue()
    expect(value).toMatch(/^data:.+/)
  })
})
