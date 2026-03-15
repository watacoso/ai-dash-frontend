import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router-dom'
import { ExplorePage } from './ExplorePage'
import { SessionProvider, useSession } from '../context/SessionContext'
import { AuthContext, AuthContextValue } from '../auth/AuthContext'

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks() })
afterAll(() => server.close())

const sfConn = { id: 'sf-1', name: 'prod-snowflake', type: 'snowflake', owner_id: 'u1', is_active: true }
const clConn = { id: 'cl-1', name: 'prod-claude', type: 'claude', owner_id: 'u1', is_active: true }

function renderExplore(connections = [sfConn, clConn]) {
  server.use(http.get('/api/connections', () => HttpResponse.json(connections)))
  const ctx: AuthContextValue = {
    user: { id: 'u1', email: 'a@b.com', role: 'analyst' },
    isAuthenticated: true, role: 'analyst', loading: false,
    login: async () => {}, logout: async () => {},
  }
  return render(
    <AuthContext.Provider value={ctx}>
      <SessionProvider>
        <MemoryRouter>
          <ExplorePage />
        </MemoryRouter>
      </SessionProvider>
    </AuthContext.Provider>
  )
}

describe('ExplorePage', () => {
  it('populates Snowflake dropdown from connections', async () => {
    renderExplore()
    await waitFor(() => expect(screen.getByRole('option', { name: 'prod-snowflake' })).toBeInTheDocument())
  })

  it('populates Claude dropdown from connections', async () => {
    renderExplore()
    await waitFor(() => expect(screen.getByRole('option', { name: 'prod-claude' })).toBeInTheDocument())
  })

  it('Start button is disabled when neither selected', async () => {
    renderExplore()
    await waitFor(() => screen.getByRole('option', { name: 'prod-snowflake' }))
    expect(screen.getByRole('button', { name: /start session/i })).toBeDisabled()
  })

  it('Start button is disabled when only Snowflake selected', async () => {
    renderExplore()
    await waitFor(() => screen.getByRole('option', { name: 'prod-snowflake' }))
    fireEvent.change(screen.getByLabelText(/snowflake connection/i), { target: { value: 'sf-1' } })
    expect(screen.getByRole('button', { name: /start session/i })).toBeDisabled()
  })

  it('Start button enabled when both selected', async () => {
    renderExplore()
    await waitFor(() => screen.getByRole('option', { name: 'prod-snowflake' }))
    fireEvent.change(screen.getByLabelText(/snowflake connection/i), { target: { value: 'sf-1' } })
    fireEvent.change(screen.getByLabelText(/claude model/i), { target: { value: 'cl-1' } })
    expect(screen.getByRole('button', { name: /start session/i })).toBeEnabled()
  })

  it('clicking Start stores IDs in SessionContext', async () => {
    let capturedSf: string | null = null
    let capturedCl: string | null = null

    function Spy() {
      const { snowflakeId, claudeId } = useSession()
      capturedSf = snowflakeId
      capturedCl = claudeId
      return null
    }

    server.use(http.get('/api/connections', () => HttpResponse.json([sfConn, clConn])))
    const ctx: AuthContextValue = {
      user: { id: 'u1', email: 'a@b.com', role: 'analyst' },
      isAuthenticated: true, role: 'analyst', loading: false,
      login: async () => {}, logout: async () => {},
    }
    render(
      <AuthContext.Provider value={ctx}>
        <SessionProvider>
          <MemoryRouter>
            <ExplorePage />
            <Spy />
          </MemoryRouter>
        </SessionProvider>
      </AuthContext.Provider>
    )

    await waitFor(() => screen.getByRole('option', { name: 'prod-snowflake' }))
    fireEvent.change(screen.getByLabelText(/snowflake connection/i), { target: { value: 'sf-1' } })
    fireEvent.change(screen.getByLabelText(/claude model/i), { target: { value: 'cl-1' } })
    fireEvent.click(screen.getByRole('button', { name: /start session/i }))

    await waitFor(() => {
      expect(capturedSf).toBe('sf-1')
      expect(capturedCl).toBe('cl-1')
    })
  })

  it('shows message when no Snowflake connections available', async () => {
    renderExplore([clConn])
    await waitFor(() =>
      expect(screen.getByText(/no snowflake connections available/i)).toBeInTheDocument()
    )
  })

  it('shows message when no Claude connections available', async () => {
    renderExplore([sfConn])
    await waitFor(() =>
      expect(screen.getByText(/no claude connections available/i)).toBeInTheDocument()
    )
  })
})
