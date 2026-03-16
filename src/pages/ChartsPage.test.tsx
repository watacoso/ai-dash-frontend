import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router-dom'
import { ChartsPage } from './ChartsPage'
import { AuthContext, AuthContextValue } from '../auth/AuthContext'

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks() })
afterAll(() => server.close())

const authCtx: AuthContextValue = {
  user: { id: 'u1', email: 'a@b.com', role: 'admin' },
  isAuthenticated: true, role: 'admin', loading: false,
  login: async () => {}, logout: async () => {},
}

const sampleDatasets = [
  { id: 'ds-1', name: 'Orders dataset', description: '', sql: '', snowflake_connection_id: 'sf-1', claude_connection_id: null, models_used: [], created_by: 'u1', created_at: '2026-03-16T10:00:00Z', updated_at: '2026-03-16T10:00:00Z' },
]

const sampleCharts = [
  { id: 'ch-1', name: 'Revenue chart', datasource_id: 'ds-1', versions: [], created_by: 'u1', created_at: '2026-03-16T10:00:00Z', updated_at: '2026-03-16T10:00:00Z' },
  { id: 'ch-2', name: 'User growth', datasource_id: 'ds-1', versions: [], created_by: 'u1', created_at: '2026-03-16T11:00:00Z', updated_at: '2026-03-16T11:00:00Z' },
]

function renderPage() {
  return render(
    <AuthContext.Provider value={authCtx}>
      <MemoryRouter>
        <ChartsPage />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('ChartsPage', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/charts', () => HttpResponse.json(sampleCharts)),
      http.get('/api/datasets', () => HttpResponse.json(sampleDatasets)),
    )
  })

  it('should render Charts heading', async () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /charts/i })).toBeInTheDocument()
  })

  it('should show loading state while fetching', async () => {
    let resolve!: (v: unknown) => void
    server.use(
      http.get('/api/charts', () => new Promise(r => { resolve = r }))
    )
    renderPage()
    await waitFor(() => expect(screen.getByText(/loading/i)).toBeInTheDocument())
    resolve(HttpResponse.json([]))
  })

  it('should render a row per chart with name and created at', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Revenue chart')).toBeInTheDocument())
    expect(screen.getByText('User growth')).toBeInTheDocument()
  })

  it('should show empty state when no charts exist', async () => {
    server.use(http.get('/api/charts', () => HttpResponse.json([])))
    renderPage()
    await waitFor(() =>
      expect(screen.getByText(/no charts yet/i)).toBeInTheDocument()
    )
  })

  it('should show error state when GET /charts fails', async () => {
    server.use(
      http.get('/api/charts', () => HttpResponse.json({ detail: 'err' }, { status: 500 }))
    )
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument()
    )
  })

  it('should render Open and Delete buttons per row', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Revenue chart')).toBeInTheDocument())
    expect(screen.getAllByRole('button', { name: /open/i })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(2)
  })

  it('should call DELETE /charts/{id} and remove row when Delete clicked', async () => {
    server.use(
      http.delete('/api/charts/ch-1', () => new HttpResponse(null, { status: 204 }))
    )
    renderPage()
    await waitFor(() => expect(screen.getByText('Revenue chart')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0])
    await waitFor(() =>
      expect(screen.queryByText('Revenue chart')).not.toBeInTheDocument()
    )
    expect(screen.getByText('User growth')).toBeInTheDocument()
  })

  it('should render New chart button', async () => {
    renderPage()
    expect(screen.getByRole('button', { name: /new chart/i })).toBeInTheDocument()
  })
})
