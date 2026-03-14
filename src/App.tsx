import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { apiLogout } from './api/auth'

function HomePage() {
  const { token, logout } = useAuth()
  async function handleLogout() {
    if (token) await apiLogout(token)
    logout()
  }
  return (
    <>
      <h1>AI-Dash</h1>
      <button onClick={handleLogout}>Log out</button>
    </>
  )
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
