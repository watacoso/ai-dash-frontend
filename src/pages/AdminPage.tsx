import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { UserTable, UserRow } from '../components/UserTable'
import { InviteModal } from '../components/InviteModal'
import { apiListUsers, apiGenerateInvite, apiPatchRole, apiPatchActive } from '../api/admin'

export function AdminPage() {
  const { token } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [showInvite, setShowInvite] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')

  useEffect(() => {
    if (!token) return
    apiListUsers(token).then((list) => {
      setUsers(list)
    })
    // Decode current user id from JWT
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      setCurrentUserId(payload.sub ?? '')
    } catch {
      // ignore
    }
  }, [token])

  async function handleRoleChange(id: string, role: string) {
    if (!token) return
    const updated = await apiPatchRole(token, id, role)
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)))
  }

  async function handleDeactivate(id: string) {
    if (!token) return
    const updated = await apiPatchActive(token, id, false)
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)))
  }

  async function handleInvite(role: string) {
    if (!token) throw new Error('Not authenticated')
    return apiGenerateInvite(token, role)
  }

  return (
    <main>
      <h1>Admin</h1>
      <button onClick={() => setShowInvite(true)}>Invite user</button>
      <UserTable
        users={users}
        currentUserId={currentUserId}
        onRoleChange={handleRoleChange}
        onDeactivate={handleDeactivate}
      />
      {showInvite && (
        <InviteModal
          onInvite={handleInvite}
          onClose={() => setShowInvite(false)}
        />
      )}
    </main>
  )
}
