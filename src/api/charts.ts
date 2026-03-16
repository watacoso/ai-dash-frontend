export interface ChartVersion {
  version: number
  d3_code: string
  accepted: boolean
  created_at: string
}

export interface ChartRow {
  id: string
  name: string
  datasource_id: string
  versions: ChartVersion[]
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

export async function apiListCharts(): Promise<ChartRow[]> {
  return authFetch('/api/charts')
}

export async function apiDeleteChart(id: string): Promise<void> {
  await authFetch(`/api/charts/${id}`, { method: 'DELETE' })
}
