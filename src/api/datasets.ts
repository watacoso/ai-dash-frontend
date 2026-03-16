export interface DatasetRow {
  id: string
  name: string
  description: string
  sql: string
  snowflake_connection_id: string
  claude_connection_id: string | null
  models_used: string[]
  created_by: string
  created_at: string
  updated_at: string
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
  return res.status === 204 ? undefined : res.json()
}

export async function apiListDatasets(): Promise<DatasetRow[]> {
  return authFetch('/api/datasets')
}

export async function apiDeleteDataset(id: string): Promise<void> {
  await authFetch(`/api/datasets/${id}`, { method: 'DELETE' })
}
