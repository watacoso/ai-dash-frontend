import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AuthProvider, useAuth } from './AuthContext'

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function TestConsumer() {
  const auth = useAuth()
  return (
    <div>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="role">{auth.role ?? 'null'}</span>
      <span data-testid="loading">{String(auth.loading)}</span>
      <button onClick={() => auth.login('a@b.com', 'pw')}>login</button>
      <button onClick={() => auth.logout()}>logout</button>
    </div>
  )
}

describe('AuthProvider', () => {
  it('bootstraps as unauthenticated when /auth/me returns 401', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json({}, { status: 401 })))
    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('false'))
    expect(screen.getByTestId('role')).toHaveTextContent('null')
  })

  it('bootstraps as authenticated when /auth/me returns user', async () => {
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({ id: 'u1', email: 'admin@example.com', role: 'admin' })
      )
    )
    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('true'))
    expect(screen.getByTestId('role')).toHaveTextContent('admin')
  })

  it('login calls POST /auth/login then GET /auth/me to populate state', async () => {
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json({}, { status: 401 })),
    )
    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('false'))

    // Set up handlers for login flow
    server.use(
      http.post('/api/auth/login', () => HttpResponse.json({ access_token: 'tok' })),
      http.get('/api/auth/me', () =>
        HttpResponse.json({ id: 'u1', email: 'a@b.com', role: 'analyst' })
      ),
    )
    await act(async () => { screen.getByRole('button', { name: 'login' }).click() })
    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('true'))
    expect(screen.getByTestId('role')).toHaveTextContent('analyst')
  })

  it('logout calls POST /auth/logout and clears state', async () => {
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({ id: 'u1', email: 'a@b.com', role: 'analyst' })
      ),
      http.post('/api/auth/logout', () => HttpResponse.json({ detail: 'Logged out' })),
    )
    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('true'))

    await act(async () => { screen.getByRole('button', { name: 'logout' }).click() })
    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('false'))
    expect(screen.getByTestId('role')).toHaveTextContent('null')
  })
})
