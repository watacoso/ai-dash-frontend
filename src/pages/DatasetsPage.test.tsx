import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router-dom'
import { DatasetsPage } from './DatasetsPage'
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

const sampleDatasets = [
  {
    id: 'ds-1',
    name: 'Orders dataset',
    description: 'All orders',
    sql: 'SELECT * FROM orders',
    snowflake_connection_id: 'sf-1',
    claude_connection_id: null,
    models_used: [],
    created_by: 'u1',
    created_at: '2026-03-16T10:00:00Z',
    updated_at: '2026-03-16T10:00:00Z',
  },
  {
    id: 'ds-2',
    name: 'Users dataset',
    description: 'Active users',
    sql: 'SELECT * FROM users',
    snowflake_connection_id: 'sf-1',
    claude_connection_id: null,
    models_used: [],
    created_by: 'u1',
    created_at: '2026-03-16T11:00:00Z',
    updated_at: '2026-03-16T11:00:00Z',
  },
]

function renderPage() {
  return render(
    <AuthContext.Provider value={authCtx}>
      <MemoryRouter>
        <DatasetsPage />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('DatasetsPage', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/datasets', () => HttpResponse.json(sampleDatasets))
    )
  })

  it('should render Datasets heading', async () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /datasets/i })).toBeInTheDocument()
  })

  it('should show loading state while fetching', async () => {
    let resolve!: (v: unknown) => void
    server.use(
      http.get('/api/datasets', () => new Promise(r => { resolve = r }))
    )
    renderPage()
    await waitFor(() => expect(screen.getByText(/loading/i)).toBeInTheDocument())
    resolve(HttpResponse.json([]))
  })

  it('should render a row per dataset with name, description, created at', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Orders dataset')).toBeInTheDocument())
    expect(screen.getByText('All orders')).toBeInTheDocument()
    expect(screen.getByText('Users dataset')).toBeInTheDocument()
    expect(screen.getByText('Active users')).toBeInTheDocument()
  })

  it('should show empty state when no datasets exist', async () => {
    server.use(http.get('/api/datasets', () => HttpResponse.json([])))
    renderPage()
    await waitFor(() =>
      expect(screen.getByText(/no datasets yet/i)).toBeInTheDocument()
    )
  })

  it('should show error state when GET /datasets fails', async () => {
    server.use(
      http.get('/api/datasets', () => HttpResponse.json({ detail: 'err' }, { status: 500 }))
    )
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument()
    )
  })

  it('should render Open and Delete buttons per row', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Orders dataset')).toBeInTheDocument())
    expect(screen.getAllByRole('button', { name: /open/i })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(2)
  })

  it('should call DELETE /datasets/{id} and remove row when Delete clicked', async () => {
    server.use(
      http.delete('/api/datasets/ds-1', () => new HttpResponse(null, { status: 204 }))
    )
    renderPage()
    await waitFor(() => expect(screen.getByText('Orders dataset')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0])
    await waitFor(() =>
      expect(screen.queryByText('Orders dataset')).not.toBeInTheDocument()
    )
    expect(screen.getByText('Users dataset')).toBeInTheDocument()
  })

  it('should render Add dataset button', async () => {
    renderPage()
    expect(screen.getByRole('button', { name: /add dataset/i })).toBeInTheDocument()
  })
})
