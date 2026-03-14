import { UserRow } from '../components/UserTable'

export interface InviteResponse {
  invite_url: string
}

async function authFetch(url: string, token: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string>),
    },
  })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

export async function apiListUsers(token: string): Promise<UserRow[]> {
  return authFetch('/api/admin/users', token)
}

export async function apiGenerateInvite(token: string, role: string): Promise<InviteResponse> {
  return authFetch('/api/admin/invite', token, {
    method: 'POST',
    body: JSON.stringify({ role }),
  })
}

export async function apiPatchRole(token: string, userId: string, role: string): Promise<UserRow> {
  return authFetch(`/api/admin/users/${userId}/role`, token, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
}

export async function apiPatchActive(token: string, userId: string, is_active: boolean): Promise<UserRow> {
  return authFetch(`/api/admin/users/${userId}/active`, token, {
    method: 'PATCH',
    body: JSON.stringify({ is_active }),
  })
}
