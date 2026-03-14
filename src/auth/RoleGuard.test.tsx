import { render, screen } from '@testing-library/react'
import { RoleGuard } from './RoleGuard'
import { AuthContext, AuthContextValue } from './AuthContext'

function renderWithRole(role: string | null, requiredRole: string) {
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
      <RoleGuard role={requiredRole}>
        <div>secret content</div>
      </RoleGuard>
    </AuthContext.Provider>,
  )
}

describe('RoleGuard', () => {
  it('renders children when role matches required role', () => {
    renderWithRole('admin', 'admin')
    expect(screen.getByText('secret content')).toBeInTheDocument()
  })

  it('renders 403 page when role does not match required role', () => {
    renderWithRole('analyst', 'admin')
    expect(screen.queryByText('secret content')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /403/i })).toBeInTheDocument()
  })

  it('renders 403 page when role is null', () => {
    renderWithRole(null, 'admin')
    expect(screen.queryByText('secret content')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /403/i })).toBeInTheDocument()
  })
})
