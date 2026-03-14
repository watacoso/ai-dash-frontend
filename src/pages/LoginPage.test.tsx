import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AuthContext, AuthContextValue } from '../auth/AuthContext'
import { LoginPage } from './LoginPage'

const mockLogin = vi.fn()
const authCtx: AuthContextValue = {
  token: null,
  isAuthenticated: false,
  login: mockLogin,
  logout: vi.fn(),
}

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => { server.resetHandlers(); mockLogin.mockReset() })
afterAll(() => server.close())

function renderLoginPage() {
  return render(
    <AuthContext.Provider value={authCtx}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('LoginPage', () => {
  it('should render email field, password field, and submit button', () => {
    // Arrange / Act
    renderLoginPage()
    // Assert
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should call API with email and password on submit', async () => {
    // Arrange
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ access_token: 'tok', token_type: 'bearer' })
      )
    )
    renderLoginPage()
    // Act
    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    // Assert
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('tok'))
  })

  it('should show inline error on 401 response', async () => {
    // Arrange
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 })
      )
    )
    renderLoginPage()
    // Act
    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    // Assert
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid email or password/i)
    )
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('should disable submit button while request is in-flight', async () => {
    // Arrange
    let resolve: () => void
    server.use(
      http.post('/api/auth/login', () =>
        new Promise<Response>((res) => { resolve = () => res(HttpResponse.json({ access_token: 'tok', token_type: 'bearer' })) })
      )
    )
    renderLoginPage()
    // Act
    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    // Assert — button disabled while pending (text changes to "Signing in…")
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
    // Cleanup
    resolve!()
  })
})
