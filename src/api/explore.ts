export interface ChatMessage {
  role: string
  content: string
}

export interface ChatPayload {
  snowflake_connection_id: string
  claude_connection_id: string
  messages: ChatMessage[]
}

export interface ChatResponse {
  role: string
  content: string
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

export async function apiExploreChat(payload: ChatPayload): Promise<ChatResponse> {
  return authFetch('/api/explore/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export interface SchemaParams {
  connection_id: string
  level: 'databases' | 'schemas' | 'tables' | 'columns'
  database?: string
  schema?: string
  table?: string
}

export async function apiGetSchema(params: SchemaParams): Promise<string[]> {
  const qs = new URLSearchParams()
  qs.set('connection_id', params.connection_id)
  qs.set('level', params.level)
  if (params.database) qs.set('database', params.database)
  if (params.schema) qs.set('schema', params.schema)
  if (params.table) qs.set('table', params.table)
  const result = await authFetch(`/api/explore/schema?${qs}`)
  return result.items
}
