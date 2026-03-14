import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Nav } from './Nav'
import { AuthContext, AuthContextValue } from '../auth/AuthContext'

function renderNav(role: string | null) {
  const ctx: AuthContextValue = {
    user: role ? { id: 'u1', email: 'a@b.com', role } : null,
    isAuthenticated: role !== null,
    role,
    loading: false,
    login: async () => {},
    logout: async () => {},
  }
  return render(
    <AuthContext.Provider value={ctx}>
      <MemoryRouter>
        <Nav />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('Nav', () => {
  it('hides admin-only items for analyst role', () => {
    renderNav('analyst')
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument()
  })

  it('shows admin-only items for admin role', () => {
    renderNav('admin')
    expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument()
  })
})
