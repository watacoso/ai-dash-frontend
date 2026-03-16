import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { UserTable, UserRow } from '../components/UserTable'
import { InviteModal } from '../components/InviteModal'
import { apiListUsers, apiGenerateInvite, apiPatchRole, apiPatchActive } from '../api/admin'

export function AdminPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [showInvite, setShowInvite] = useState(false)

  useEffect(() => {
    apiListUsers().then(setUsers)
  }, [])

  async function handleRoleChange(id: string, role: string) {
    const updated = await apiPatchRole(id, role)
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)))
  }

  async function handleDeactivate(id: string) {
    const updated = await apiPatchActive(id, false)
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)))
  }

  return (
    <main>
      <div className="page-header">
        <h1>Admin</h1>
        <button className="btn-primary" onClick={() => setShowInvite(true)}>Invite user</button>
      </div>
      <UserTable
        users={users}
        currentUserId={user?.id ?? ''}
        onRoleChange={handleRoleChange}
        onDeactivate={handleDeactivate}
      />
      {showInvite && (
        <InviteModal
          onInvite={apiGenerateInvite}
          onClose={() => setShowInvite(false)}
        />
      )}
    </main>
  )
}
