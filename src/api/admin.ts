import { UserRow } from '../components/UserTable'

export interface InviteResponse {
  invite_url: string
}

async function authFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
  })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

export async function apiListUsers(): Promise<UserRow[]> {
  return authFetch('/api/admin/users')
}

export async function apiGenerateInvite(role: string): Promise<InviteResponse> {
  return authFetch('/api/admin/invite', {
    method: 'POST',
    body: JSON.stringify({ role }),
  })
}

export async function apiPatchRole(userId: string, role: string): Promise<UserRow> {
  return authFetch(`/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
}

export async function apiPatchActive(userId: string, is_active: boolean): Promise<UserRow> {
  return authFetch(`/api/admin/users/${userId}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active }),
  })
}
