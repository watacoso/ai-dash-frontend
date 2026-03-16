import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ChatMessage, LogEntry } from '../api/explore'
import { apiQueryChat } from '../api/query'
import { useSession } from '../context/SessionContext'

export function QueryPage() {
  const { snowflakeId, claudeId } = useSession()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [currentQuery, setCurrentQuery] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!snowflakeId || !claudeId) {
    return <Navigate to="/explore" replace />
  }

  async function handleSend() {
    if (!input.trim() || loading) return
    const userMsg: ChatMessage = { role: 'user', content: input.trim() }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    setError(null)
    try {
      const response = await apiQueryChat({
        snowflake_connection_id: snowflakeId!,
        claude_connection_id: claudeId!,
        messages: nextMessages,
      })
      setMessages((prev) => [...prev, { role: response.role, content: response.content }])
      if (response.query) setCurrentQuery(response.query)
      if (response.logs?.length) setLogs((prev) => [...prev, ...response.logs])
    } catch {
      setError('Failed to get a response. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <main>
      <h1>Query</h1>
      {error && <p role="alert" className="error-text">{error}</p>}
      <div className="query-wrap">
        <div className="chat">
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className="chat-bubble" data-role={msg.role}>
                {msg.content}
              </div>
            ))}
            {loading && <div className="chat-thinking">Thinking…</div>}
            <div ref={bottomRef} />
          </div>
          <div className="chat-input-row">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the query you need…"
              disabled={loading}
            />
            <button onClick={handleSend} disabled={loading || !input.trim()}>
              Send
            </button>
          </div>
        </div>
        <div className="query-sidebar" data-current-query={currentQuery ?? ''} />
      </div>
    </main>
  )
}
