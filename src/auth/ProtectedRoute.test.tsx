import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthContext, AuthContextValue } from './AuthContext'
import { ProtectedRoute } from './ProtectedRoute'

function renderWithAuth(value: AuthContextValue, initialPath = '/') {
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<div>login page</div>} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div>protected content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

const authenticatedCtx: AuthContextValue = {
  user: { id: 'u1', email: 'a@b.com', role: 'analyst' },
  isAuthenticated: true,
  role: 'analyst',
  loading: false,
  login: async () => {},
  logout: async () => {},
}

const unauthenticatedCtx: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  role: null,
  loading: false,
  login: async () => {},
  logout: async () => {},
}

const loadingCtx: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  role: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
}

describe('ProtectedRoute', () => {
  it('should render children when authenticated', () => {
    renderWithAuth(authenticatedCtx)
    expect(screen.getByText('protected content')).toBeInTheDocument()
  })

  it('should redirect to /login when not authenticated and not loading', () => {
    renderWithAuth(unauthenticatedCtx)
    expect(screen.getByText('login page')).toBeInTheDocument()
    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
  })

  it('should render nothing while loading (prevents flash redirect)', () => {
    renderWithAuth(loadingCtx)
    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
    expect(screen.queryByText('login page')).not.toBeInTheDocument()
  })
})
