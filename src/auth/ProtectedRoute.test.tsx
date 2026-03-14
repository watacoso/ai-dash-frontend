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
  token: 'tok',
  isAuthenticated: true,
  login: () => {},
  logout: () => {},
}

const unauthenticatedCtx: AuthContextValue = {
  token: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
}

describe('ProtectedRoute', () => {
  it('should render children when authenticated', () => {
    // Arrange / Act
    renderWithAuth(authenticatedCtx)
    // Assert
    expect(screen.getByText('protected content')).toBeInTheDocument()
  })

  it('should redirect to /login when not authenticated', () => {
    // Arrange / Act
    renderWithAuth(unauthenticatedCtx)
    // Assert
    expect(screen.getByText('login page')).toBeInTheDocument()
    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
  })
})
