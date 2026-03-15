export interface ConnectionRow {
  id: string
  name: string
  type: 'snowflake' | 'claude'
  owner_id: string
  is_active: boolean
}

export interface ConnectionCreate {
  name: string
  type: 'snowflake' | 'claude'
  credentials: Record<string, string>
}

export interface ConnectionUpdate {
  name?: string
  credentials?: Record<string, string>
  is_active?: boolean
}

export interface TestResult {
  ok: boolean
  latency_ms?: number
  error?: string
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

export async function apiListConnections(): Promise<ConnectionRow[]> {
  return authFetch('/api/connections')
}

export async function apiCreateConnection(body: ConnectionCreate): Promise<ConnectionRow> {
  return authFetch('/api/connections', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function apiUpdateConnection(id: string, body: ConnectionUpdate): Promise<ConnectionRow> {
  return authFetch(`/api/connections/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function apiDeleteConnection(id: string): Promise<void> {
  const res = await fetch(`/api/connections/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok && res.status !== 204) throw new Error(`${res.status}`)
}

export async function apiTestConnection(id: string): Promise<TestResult> {
  return authFetch(`/api/connections/${id}/test`, { method: 'POST' })
}
