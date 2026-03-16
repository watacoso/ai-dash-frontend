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

  it('shows Settings link for admin', () => {
    renderNav('admin')
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
  })

  it('hides Settings link for analyst', () => {
    renderNav('analyst')
    expect(screen.queryByRole('link', { name: /settings/i })).not.toBeInTheDocument()
  })

  it('shows New session link for analyst', () => {
    renderNav('analyst')
    expect(screen.getByRole('link', { name: /explore/i })).toBeInTheDocument()
  })

  it('shows New session link for admin', () => {
    renderNav('admin')
    expect(screen.getByRole('link', { name: /explore/i })).toBeInTheDocument()
  })

  it('should render a Datasets nav link for analyst', () => {
    renderNav('analyst')
    expect(screen.getByRole('link', { name: /datasets/i })).toBeInTheDocument()
  })

  it('should not render a Query nav link', () => {
    renderNav('analyst')
    expect(screen.queryByRole('link', { name: /^query$/i })).not.toBeInTheDocument()
  })

  it('should render as an aside element', () => {
    const { container } = renderNav('analyst')
    expect(container.querySelector('aside')).toBeInTheDocument()
  })

  it('should render a collapse toggle button', () => {
    renderNav('analyst')
    expect(screen.getByRole('button', { name: /collapse|toggle|sidebar/i })).toBeInTheDocument()
  })
})
