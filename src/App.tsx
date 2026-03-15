import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { RoleGuard } from './auth/RoleGuard'
import { LoginPage } from './pages/LoginPage'
import { AdminPage } from './pages/AdminPage'
import { SettingsPage } from './pages/SettingsPage'
import { ExplorePage } from './pages/ExplorePage'
import { SessionProvider } from './context/SessionContext'
import { Nav } from './components/Nav'

function HomePage() {
  const { logout } = useAuth()
  return (
    <>
      <Nav />
      <h1>AI-Dash</h1>
      <button onClick={logout}>Log out</button>
    </>
  )
}

export function App() {
  return (
    <AuthProvider>
      <SessionProvider>
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
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <RoleGuard role="admin">
                  <AdminPage />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/connections"
            element={
              <ProtectedRoute>
                <RoleGuard role="admin">
                  <SettingsPage />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/explore"
            element={
              <ProtectedRoute>
                <ExplorePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </SessionProvider>
    </AuthProvider>
  )
}
