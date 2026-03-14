import { createContext, useContext, useEffect, useState } from 'react'
import { apiLogin, apiLogout, apiMe } from '../api/auth'

export interface AuthUser {
  id: string
  email: string
  role: string
}

export interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  role: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiMe().then((me) => {
      setUser(me)
      setLoading(false)
    })
  }, [])

  const login = async (email: string, password: string) => {
    await apiLogin(email, password)
    const me = await apiMe()
    setUser(me)
  }

  const logout = async () => {
    await apiLogout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: user !== null,
      role: user?.role ?? null,
      loading,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
