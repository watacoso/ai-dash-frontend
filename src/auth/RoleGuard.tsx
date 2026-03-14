import { useAuth } from './AuthContext'

export function RoleGuard({ role, children }: { role: string; children: React.ReactNode }) {
  const { role: userRole } = useAuth()
  if (userRole !== role) {
    return (
      <main>
        <h1>403</h1>
        <p>You do not have permission to view this page.</p>
      </main>
    )
  }
  return <>{children}</>
}
