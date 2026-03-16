import { ChatMessage, LogEntry } from './explore'

export interface QueryChatPayload {
  snowflake_connection_id: string
  claude_connection_id: string
  messages: ChatMessage[]
}

export interface QueryChatResponse {
  role: string
  content: string
  query: string | null
  logs: LogEntry[]
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

export async function apiQueryChat(payload: QueryChatPayload): Promise<QueryChatResponse> {
  return authFetch('/api/query/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
