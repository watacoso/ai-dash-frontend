import { render, screen, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'

function TestConsumer() {
  const auth = useAuth()
  return (
    <div>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="token">{auth.token ?? 'null'}</span>
      <button onClick={() => auth.login('test-token')}>login</button>
      <button onClick={() => auth.logout()}>logout</button>
    </div>
  )
}

describe('useAuth', () => {
  it('should have isAuthenticated false initially', () => {
    // Arrange / Act
    render(<AuthProvider><TestConsumer /></AuthProvider>)
    // Assert
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
  })

  it('should set isAuthenticated to true after login', () => {
    // Arrange
    render(<AuthProvider><TestConsumer /></AuthProvider>)
    // Act
    act(() => screen.getByRole('button', { name: 'login' }).click())
    // Assert
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    expect(screen.getByTestId('token')).toHaveTextContent('test-token')
  })

  it('should set isAuthenticated to false after logout', () => {
    // Arrange
    render(<AuthProvider><TestConsumer /></AuthProvider>)
    act(() => screen.getByRole('button', { name: 'login' }).click())
    // Act
    act(() => screen.getByRole('button', { name: 'logout' }).click())
    // Assert
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    expect(screen.getByTestId('token')).toHaveTextContent('null')
  })
})
