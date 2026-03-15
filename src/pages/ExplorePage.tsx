import { useEffect, useState } from 'react'
import { ConnectionRow, apiListConnections } from '../api/connections'
import { ChatMessage, apiExploreChat } from '../api/explore'
import { ExploreChat } from '../components/ExploreChat'
import { useSession } from '../context/SessionContext'

export function ExplorePage() {
  const { snowflakeId, claudeId, setSnowflakeId, setClaudeId } = useSession()
  const [connections, setConnections] = useState<ConnectionRow[]>([])
  const [selectedSf, setSelectedSf] = useState('')
  const [selectedCl, setSelectedCl] = useState('')
  const [started, setStarted] = useState(snowflakeId !== null && claudeId !== null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiListConnections().then(setConnections)
  }, [])

  const snowflakeConns = connections.filter((c) => c.type === 'snowflake')
  const claudeConns = connections.filter((c) => c.type === 'claude')
  const canStart = !!selectedSf && !!selectedCl

  function handleStart() {
    setSnowflakeId(selectedSf)
    setClaudeId(selectedCl)
    setStarted(true)
  }

  async function handleSend(text: string) {
    const userMsg: ChatMessage = { role: 'user', content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setLoading(true)
    setError(null)
    try {
      const response = await apiExploreChat({
        snowflake_connection_id: snowflakeId!,
        claude_connection_id: claudeId!,
        messages: nextMessages,
      })
      setMessages((prev) => [...prev, response])
    } catch {
      setError('Failed to get a response. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (started) {
    return (
      <main>
        <h1>Explore</h1>
        {error && <p role="alert" className="error-text">{error}</p>}
        <ExploreChat messages={messages} loading={loading} onSend={handleSend} />
      </main>
    )
  }

  return (
    <div className="session-start">
      <div className="session-card">
        <h1>New session</h1>
        <p>Select the connections to use for this session.</p>

        <div className="form-field">
          <label htmlFor="sf-select">Snowflake connection</label>
          {snowflakeConns.length === 0 ? (
            <p>No Snowflake connections available — ask your admin to add one.</p>
          ) : (
            <select
              id="sf-select"
              aria-label="Snowflake connection"
              value={selectedSf}
              onChange={(e) => setSelectedSf(e.target.value)}
            >
              <option value="">— select —</option>
              {snowflakeConns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="cl-select">Claude model</label>
          {claudeConns.length === 0 ? (
            <p>No Claude connections available — ask your admin to add one.</p>
          ) : (
            <select
              id="cl-select"
              aria-label="Claude model"
              value={selectedCl}
              onChange={(e) => setSelectedCl(e.target.value)}
            >
              <option value="">— select —</option>
              {claudeConns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        <button onClick={handleStart} disabled={!canStart}>
          Start session
        </button>
      </div>
    </div>
  )
}
