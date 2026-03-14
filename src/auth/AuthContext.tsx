import { createContext, useContext, useState } from 'react'

export interface AuthContextValue {
  token: string | null
  isAuthenticated: boolean
  role: string | null
  login: (token: string) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

function parseRole(token: string): string | null {
  try {
    const base64url = token.split('.')[1]
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64))
    return typeof payload.role === 'string' ? payload.role : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)

  const login = (t: string) => {
    setToken(t)
    setRole(parseRole(t))
  }
  const logout = () => {
    setToken(null)
    setRole(null)
  }

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: token !== null, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
