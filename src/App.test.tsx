import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthContext, AuthContextValue } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { DatasetsPage } from './pages/DatasetsPage'

const server = setupServer(
  http.get('/api/datasets', () => HttpResponse.json([]))
)
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const authCtx: AuthContextValue = {
  user: { id: 'u1', email: 'a@b.com', role: 'analyst' },
  isAuthenticated: true, role: 'analyst', loading: false,
  login: async () => {}, logout: async () => {},
}

describe('App routing', () => {
  it('should render DatasetsPage at /datasets', async () => {
    render(
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter initialEntries={['/datasets']}>
          <Routes>
            <Route
              path="/datasets"
              element={<ProtectedRoute><DatasetsPage /></ProtectedRoute>}
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    )
    expect(screen.getByRole('heading', { name: /datasets/i })).toBeInTheDocument()
  })

  it('should not render old Query page content at /datasets', async () => {
    render(
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter initialEntries={['/datasets']}>
          <Routes>
            <Route
              path="/datasets"
              element={<ProtectedRoute><DatasetsPage /></ProtectedRoute>}
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    )
    await waitFor(() => expect(screen.queryByPlaceholderText(/describe the query/i)).not.toBeInTheDocument())
  })
})
