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
