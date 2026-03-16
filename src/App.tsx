import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { RoleGuard } from './auth/RoleGuard'
import { LoginPage } from './pages/LoginPage'
import { AdminPage } from './pages/AdminPage'
import { SettingsPage } from './pages/SettingsPage'
import { DatasetsPage } from './pages/DatasetsPage'
import { ExplorePage } from './pages/ExplorePage'
import { SessionProvider } from './context/SessionContext'
import { Nav } from './components/Nav'

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <div className="page-content">{children}</div>
    </>
  )
}

function HomePage() {
  const { logout } = useAuth()
  return (
    <>
      <h1>AI-Dash</h1>
      <button className="btn-secondary" onClick={logout}>Log out</button>
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
                  <AppLayout><HomePage /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <RoleGuard role="admin">
                    <AppLayout><AdminPage /></AppLayout>
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/connections"
              element={
                <ProtectedRoute>
                  <RoleGuard role="admin">
                    <AppLayout><SettingsPage /></AppLayout>
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/explore"
              element={
                <ProtectedRoute>
                  <AppLayout><ExplorePage /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/datasets"
              element={
                <ProtectedRoute>
                  <AppLayout><DatasetsPage /></AppLayout>
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
