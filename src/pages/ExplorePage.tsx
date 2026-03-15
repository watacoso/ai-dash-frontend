import { useEffect, useState } from 'react'
import { ConnectionRow, apiListConnections } from '../api/connections'
import { useSession } from '../context/SessionContext'

export function ExplorePage() {
  const { snowflakeId, claudeId, setSnowflakeId, setClaudeId } = useSession()
  const [connections, setConnections] = useState<ConnectionRow[]>([])
  const [selectedSf, setSelectedSf] = useState('')
  const [selectedCl, setSelectedCl] = useState('')
  const [started, setStarted] = useState(snowflakeId !== null && claudeId !== null)

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

  if (started) {
    return (
      <main>
        <h1>Explore</h1>
        <p>Session active — chat interface coming in EPI-0003.</p>
      </main>
    )
  }

  return (
    <main>
      <h1>New session</h1>
      <p>Select the connections to use for this session.</p>

      <div>
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

      <div>
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
    </main>
  )
}
