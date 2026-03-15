import { useEffect, useState } from 'react'
import { ConnectionRow, TestResult, apiListConnections, apiDeleteConnection, apiTestConnection } from '../api/connections'
import { ConnectionForm } from '../components/ConnectionForm'

export function SettingsPage() {
  const [connections, setConnections] = useState<ConnectionRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ConnectionRow | undefined>()
  const [testResults, setTestResults] = useState<Record<string, TestResult | 'pending'>>({})

  async function load() {
    const data = await apiListConnections()
    setConnections(data)
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this connection?')) return
    await apiDeleteConnection(id)
    await load()
  }

  async function handleTest(id: string) {
    setTestResults((prev) => ({ ...prev, [id]: 'pending' }))
    const result = await apiTestConnection(id)
    setTestResults((prev) => ({ ...prev, [id]: result }))
  }

  function handleFormSuccess() {
    setShowForm(false)
    setEditing(undefined)
    load()
  }

  if (showForm || editing) {
    return (
      <main>
        <h1>Connections</h1>
        <ConnectionForm
          initial={editing}
          onSuccess={handleFormSuccess}
          onCancel={() => { setShowForm(false); setEditing(undefined) }}
        />
      </main>
    )
  }

  return (
    <main>
      <h1>Connections</h1>
      <button onClick={() => setShowForm(true)}>Add connection</button>

      {connections.length === 0 ? (
        <p>No connections configured.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Type</th><th>Actions</th><th>Test result</th>
            </tr>
          </thead>
          <tbody>
            {connections.map((conn) => {
              const testResult = testResults[conn.id]
              return (
                <tr key={conn.id}>
                  <td>{conn.name}</td>
                  <td>{conn.type}</td>
                  <td>
                    <button onClick={() => handleTest(conn.id)}>Test</button>
                    <button onClick={() => setEditing(conn)}>Edit</button>
                    <button onClick={() => handleDelete(conn.id)}>Delete</button>
                  </td>
                  <td>
                    {testResult === 'pending' && (
                      <span role="status">Testing…</span>
                    )}
                    {testResult && testResult !== 'pending' && testResult.ok && (
                      <span>OK {testResult.latency_ms != null ? `${testResult.latency_ms}ms` : ''}</span>
                    )}
                    {testResult && testResult !== 'pending' && !testResult.ok && (
                      <span>{testResult.error}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </main>
  )
}
