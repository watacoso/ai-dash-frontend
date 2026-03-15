import { useState } from 'react'

interface InviteResult {
  invite_url: string
}

interface Props {
  onInvite: (role: string) => Promise<InviteResult>
  onClose: () => void
}

export function InviteModal({ onInvite, onClose }: Props) {
  const [role, setRole] = useState('analyst')
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await onInvite(role)
    setInviteUrl(result.invite_url)
    setLoading(false)
  }

  return (
    <div role="dialog" aria-modal="true">
      <h2>Invite user</h2>
      {!inviteUrl ? (
        <form onSubmit={handleSubmit}>
          <label htmlFor="invite-role">Role</label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="analyst">analyst</option>
            <option value="admin">admin</option>
          </select>
          <button type="submit" disabled={loading}>
            {loading ? 'Generating…' : 'Generate invite'}
          </button>
        </form>
      ) : (
        <div>
          <p>Share this link with the new user:</p>
          <span className="invite-url">{inviteUrl}</span>
          <button onClick={onClose}>Close</button>
        </div>
      )}
    </div>
  )
}
