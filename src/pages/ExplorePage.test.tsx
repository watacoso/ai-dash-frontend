import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router-dom'
import { ExplorePage } from './ExplorePage'
import { SessionProvider, useSession, SessionContext } from '../context/SessionContext'
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

const authCtx: AuthContextValue = {
  user: { id: 'u1', email: 'a@b.com', role: 'analyst' },
  isAuthenticated: true, role: 'analyst', loading: false,
  login: async () => {}, logout: async () => {},
}

/** Renders ExplorePage with session already started (snowflakeId + claudeId set) */
function renderStarted() {
  server.use(http.get('/api/connections', () => HttpResponse.json([sfConn, clConn])))
  const sessionValue = {
    snowflakeId: 'sf-1',
    claudeId: 'cl-1',
    setSnowflakeId: vi.fn(),
    setClaudeId: vi.fn(),
  }
  return render(
    <AuthContext.Provider value={authCtx}>
      <SessionContext.Provider value={sessionValue}>
        <MemoryRouter>
          <ExplorePage />
        </MemoryRouter>
      </SessionContext.Provider>
    </AuthContext.Provider>
  )
}

describe('ExplorePage — chat (post-session-start)', () => {
  it('renders chat input when session is active', () => {
    renderStarted()
    expect(screen.getByPlaceholderText(/ask about your data/i)).toBeInTheDocument()
  })

  it('appends user message to history on send', async () => {
    server.use(
      http.post('/api/explore/chat', () =>
        HttpResponse.json({ role: 'assistant', content: 'I see DB1.' })
      )
    )
    renderStarted()
    fireEvent.change(screen.getByPlaceholderText(/ask about your data/i), {
      target: { value: 'what databases are available?' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() =>
      expect(screen.getByText('what databases are available?')).toBeInTheDocument()
    )
  })

  it('appends assistant response to history after API call', async () => {
    server.use(
      http.post('/api/explore/chat', () =>
        HttpResponse.json({ role: 'assistant', content: 'You have DB1, DB2.' })
      )
    )
    renderStarted()
    fireEvent.change(screen.getByPlaceholderText(/ask about your data/i), {
      target: { value: 'list databases' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() =>
      expect(screen.getByText('You have DB1, DB2.')).toBeInTheDocument()
    )
  })

  it('shows error message on API failure without clearing history', async () => {
    server.use(
      http.post('/api/explore/chat', () =>
        HttpResponse.json({ detail: 'err' }, { status: 500 })
      )
    )
    renderStarted()
    fireEvent.change(screen.getByPlaceholderText(/ask about your data/i), {
      target: { value: 'list databases' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() =>
      expect(screen.getByText('list databases')).toBeInTheDocument()
    )
    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument()
    )
  })
})

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
