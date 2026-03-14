export interface UserRow {
  id: string
  email: string
  name: string
  role: string
  is_active: boolean
}

interface Props {
  users: UserRow[]
  currentUserId: string
  onRoleChange: (id: string, role: string) => void
  onDeactivate: (id: string) => void
}

export function UserTable({ users, currentUserId, onRoleChange, onDeactivate }: Props) {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id}>
            <td>{u.name}</td>
            <td>{u.email}</td>
            <td>
              <select
                value={u.role}
                onChange={(e) => onRoleChange(u.id, e.target.value)}
              >
                <option value="admin">admin</option>
                <option value="analyst">analyst</option>
              </select>
            </td>
            <td>{u.is_active ? 'active' : 'inactive'}</td>
            <td>
              {u.id !== currentUserId && (
                <button onClick={() => onDeactivate(u.id)}>Deactivate</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
