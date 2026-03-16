import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SettingsPage } from './SettingsPage'
import * as api from '../api/connections'

vi.mock('../api/connections')

const mockConnections = [
  { id: 'c1', name: 'prod-snowflake', type: 'snowflake' as const, owner_id: 'u1', is_active: true },
  { id: 'c2', name: 'prod-claude', type: 'claude' as const, owner_id: 'u1', is_active: true },
]

describe('SettingsPage', () => {
  afterEach(() => vi.restoreAllMocks())

  beforeEach(() => {
    vi.mocked(api.apiListConnections).mockResolvedValue(mockConnections)
    vi.mocked(api.apiDeleteConnection).mockResolvedValue(undefined)
    vi.mocked(api.apiTestConnection).mockResolvedValue({ ok: true, latency_ms: 42 })
  })

  it('renders connection rows', async () => {
    render(<SettingsPage />)
    await waitFor(() => expect(screen.getByText('prod-snowflake')).toBeInTheDocument())
    expect(screen.getByText('prod-claude')).toBeInTheDocument()
  })

  it('shows empty state when no connections', async () => {
    vi.mocked(api.apiListConnections).mockResolvedValue([])
    render(<SettingsPage />)
    await waitFor(() => expect(screen.getByText(/no connections/i)).toBeInTheDocument())
  })

  it('calls apiDeleteConnection and removes row after confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(api.apiListConnections)
      .mockResolvedValueOnce(mockConnections)
      .mockResolvedValueOnce([mockConnections[1]])

    render(<SettingsPage />)
    await waitFor(() => screen.getByText('prod-snowflake'))

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0])

    await waitFor(() => expect(api.apiDeleteConnection).toHaveBeenCalledWith('c1'))
    await waitFor(() => expect(screen.queryByText('prod-snowflake')).not.toBeInTheDocument())
  })

  it('does not delete when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<SettingsPage />)
    await waitFor(() => screen.getByText('prod-snowflake'))

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0])

    expect(api.apiDeleteConnection).not.toHaveBeenCalled()
    expect(screen.getByText('prod-snowflake')).toBeInTheDocument()
  })

  it('shows success indicator after test returns ok=true', async () => {
    render(<SettingsPage />)
    await waitFor(() => screen.getByText('prod-snowflake'))

    const testButtons = screen.getAllByRole('button', { name: /^test$/i })
    fireEvent.click(testButtons[0])

    await waitFor(() => expect(screen.getByText(/42\s*ms|latency.*42|ok/i)).toBeInTheDocument())
  })

  it('shows error message after test returns ok=false', async () => {
    vi.mocked(api.apiTestConnection).mockResolvedValue({ ok: false, error: 'timeout' })
    render(<SettingsPage />)
    await waitFor(() => screen.getByText('prod-snowflake'))

    const testButtons = screen.getAllByRole('button', { name: /^test$/i })
    fireEvent.click(testButtons[0])

    await waitFor(() => expect(screen.getByText(/timeout/i)).toBeInTheDocument())
  })

  it('should render Delete button with btn-danger class', async () => {
    render(<SettingsPage />)
    await waitFor(() => screen.getByText('prod-snowflake'))
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    expect(deleteButtons[0]).toHaveClass('btn-danger')
  })

  it('shows spinner while test is pending', async () => {
    vi.mocked(api.apiTestConnection).mockImplementation(
      () => new Promise(() => {}) // never resolves
    )
    render(<SettingsPage />)
    await waitFor(() => screen.getByText('prod-snowflake'))

    const testButtons = screen.getAllByRole('button', { name: /^test$/i })
    fireEvent.click(testButtons[0])

    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
  })
})
