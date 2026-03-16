import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryPage } from './QueryPage'
import { SessionContext } from '../context/SessionContext'
import { AuthContext, AuthContextValue } from '../auth/AuthContext'

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks() })
afterAll(() => server.close())

const authCtx: AuthContextValue = {
  user: { id: 'u1', email: 'a@b.com', role: 'analyst' },
  isAuthenticated: true, role: 'analyst', loading: false,
  login: async () => {}, logout: async () => {},
}

const sessionWithIds = {
  snowflakeId: 'sf-1',
  claudeId: 'cl-1',
  setSnowflakeId: vi.fn(),
  setClaudeId: vi.fn(),
}

const sessionEmpty = {
  snowflakeId: null,
  claudeId: null,
  setSnowflakeId: vi.fn(),
  setClaudeId: vi.fn(),
}

function renderQuery(session = sessionWithIds) {
  return render(
    <AuthContext.Provider value={authCtx}>
      <SessionContext.Provider value={session}>
        <MemoryRouter initialEntries={['/query']}>
          <Routes>
            <Route path="/query" element={<QueryPage />} />
            <Route path="/explore" element={<div>explore page</div>} />
          </Routes>
        </MemoryRouter>
      </SessionContext.Provider>
    </AuthContext.Provider>
  )
}

const defaultChatResponse = { role: 'assistant', content: 'Here is your query.', query: null, logs: [] }

describe('QueryPage', () => {
  beforeEach(() => {
    server.use(
      http.post('/api/query/chat', () => HttpResponse.json(defaultChatResponse))
    )
  })

  it('should redirect to /explore when session IDs are missing', () => {
    renderQuery(sessionEmpty)
    expect(screen.getByText('explore page')).toBeInTheDocument()
  })

  it('should render Query heading', () => {
    renderQuery()
    expect(screen.getByRole('heading', { name: /query/i })).toBeInTheDocument()
  })

  it('should render sidebar placeholder', () => {
    renderQuery()
    expect(document.querySelector('.query-sidebar')).toBeInTheDocument()
  })

  it('should render chat textarea and Send button', () => {
    renderQuery()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('should disable Send button while request is in-flight', async () => {
    let resolve!: (v: unknown) => void
    server.use(
      http.post('/api/query/chat', () => new Promise(r => { resolve = r }))
    )
    renderQuery()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'list my tables' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /send/i })).toBeDisabled())
    resolve(HttpResponse.json(defaultChatResponse))
  })

  it('should append user message to chat history on send', async () => {
    renderQuery()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'list my tables' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() =>
      expect(screen.getByText('list my tables')).toBeInTheDocument()
    )
  })

  it('should append assistant response to chat history', async () => {
    server.use(
      http.post('/api/query/chat', () =>
        HttpResponse.json({ role: 'assistant', content: 'Here is your query.', query: 'SELECT id FROM orders', logs: [] })
      )
    )
    renderQuery()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'give me orders' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() =>
      expect(screen.getByText('Here is your query.')).toBeInTheDocument()
    )
  })

  it('should call POST /query/chat with connection IDs from session context', async () => {
    let capturedBody: unknown
    server.use(
      http.post('/api/query/chat', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(defaultChatResponse)
      })
    )
    renderQuery()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'list tables' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(capturedBody).toBeDefined())
    expect(capturedBody).toMatchObject({
      snowflake_connection_id: 'sf-1',
      claude_connection_id: 'cl-1',
    })
  })

  it('should show error message on API failure without clearing history', async () => {
    server.use(
      http.post('/api/query/chat', () => HttpResponse.json({ detail: 'err' }, { status: 500 }))
    )
    renderQuery()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'list tables' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(screen.getByText('list tables')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })
})
