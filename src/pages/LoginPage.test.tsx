import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext, AuthContextValue } from '../auth/AuthContext'
import { LoginPage } from './LoginPage'

const mockLogin = vi.fn()
const authCtx: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  role: null,
  login: mockLogin,
  logout: vi.fn(),
}

function renderLoginPage() {
  return render(
    <AuthContext.Provider value={authCtx}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

afterEach(() => mockLogin.mockReset())

describe('LoginPage', () => {
  it('should render email field, password field, and submit button', () => {
    renderLoginPage()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should call login with email and password on submit', async () => {
    mockLogin.mockResolvedValue(undefined)
    renderLoginPage()
    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'secret')
    )
  })

  it('should show inline error when login throws', async () => {
    mockLogin.mockRejectedValue(new Error('invalid_credentials'))
    renderLoginPage()
    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid email or password/i)
    )
  })

  it('should disable submit button while request is in-flight', async () => {
    let resolve: () => void
    mockLogin.mockReturnValue(new Promise<void>((res) => { resolve = res }))
    renderLoginPage()
    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
    resolve!()
  })
})
