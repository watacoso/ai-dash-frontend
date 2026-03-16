import { useEffect, useRef, useState } from 'react'
import { ConnectionRow, apiListConnections } from '../api/connections'
import { DatasetRow } from '../api/datasets'

export interface DatasetInitialValues {
  id?: string
  name: string
  description: string
  sql: string
  snowflake_connection_id: string
  claude_connection_id: string | null
  models_used: string[]
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: (dataset: DatasetRow) => void
  initialValues?: DatasetInitialValues
}

function formatModelsUsed(models: string[]): string {
  if (models.length === 0) return ''
  if (models.length === 1) return models[0]
  if (models.length === 2) return models.join(', ')
  return `${models[0]} and ${models.length - 1} others`
}

interface RunResult {
  columns: string[]
  rows: string[][]
  row_count: number
  duration_ms: number
  executed_at: string
}

async function authFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) },
  })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

export function DatasetDialog({ open, onClose, onSaved, initialValues }: Props) {
  const [connections, setConnections] = useState<ConnectionRow[]>([])
  const [name, setName] = useState(initialValues?.name ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [sql, setSql] = useState(initialValues?.sql ?? '')
  const [snowflakeId, setSnowflakeId] = useState(initialValues?.snowflake_connection_id ?? '')
  const [claudeId, setClaudeId] = useState(initialValues?.claude_connection_id ?? '')
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [resultsOpen, setResultsOpen] = useState(false)
  const cancelledRef = useRef(false)

  const modelsUsed = initialValues?.models_used ?? []
  const isEditMode = !!initialValues?.id
  const canSave = name.trim() !== '' && sql.trim() !== '' && snowflakeId !== ''
  const canRun = sql.trim() !== '' && snowflakeId !== ''

  useEffect(() => {
    if (open) apiListConnections().then(setConnections)
  }, [open])

  // Sync fields when initialValues changes (e.g. dialog re-opened with different dataset)
  useEffect(() => {
    setName(initialValues?.name ?? '')
    setDescription(initialValues?.description ?? '')
    setSql(initialValues?.sql ?? '')
    setSnowflakeId(initialValues?.snowflake_connection_id ?? '')
    setClaudeId(initialValues?.claude_connection_id ?? '')
  }, [initialValues])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }

  function handleCancel() {
    cancelledRef.current = true
    setRunning(false)
  }

  async function handleRun() {
    if (!canRun || running) return
    setRunResult(null)
    setRunError(null)
    setRunning(true)
    setResultsOpen(true)
    cancelledRef.current = false
    const url = initialValues?.id
      ? `/api/datasets/${initialValues.id}/run`
      : '/api/datasets/run'
    try {
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: initialValues?.id ? undefined : JSON.stringify({ sql, snowflake_connection_id: snowflakeId }),
      })
      if (cancelledRef.current) return
      if (res.ok) {
        const data = await res.json()
        setRunResult(data)
      } else {
        const data = await res.json()
        setRunError(data.error ?? `Error ${res.status}`)
      }
    } catch {
      if (!cancelledRef.current) setRunError('Request failed')
    } finally {
      if (!cancelledRef.current) setRunning(false)
    }
  }

  async function handleSave() {
    if (!canSave || saving) return
    setSaving(true)
    try {
      const body = { name: name.trim(), description, sql, snowflake_connection_id: snowflakeId, claude_connection_id: claudeId || null }
      const result = isEditMode
        ? await authFetch(`/api/datasets/${initialValues!.id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await authFetch('/api/datasets', { method: 'POST', body: JSON.stringify(body) })
      onSaved(result)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const sfConns = connections.filter(c => c.type === 'snowflake')
  const clConns = connections.filter(c => c.type === 'claude')
  const modelsLabel = formatModelsUsed(modelsUsed)

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="dataset-dialog-overlay"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="dataset-dialog">
        {/* Header */}
        <div className="dataset-dialog-header">
          <div className="dataset-dialog-header-fields">
            <input
              className="dataset-dialog-name"
              placeholder="Name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <input
              className="dataset-dialog-description"
              placeholder="Description"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
            {modelsLabel && (
              <span className="dataset-dialog-models-badge" data-testid="models-used-badge">
                {modelsLabel}
              </span>
            )}
          </div>
          <div className="dataset-dialog-header-connections">
            <select value={snowflakeId} onChange={e => setSnowflakeId(e.target.value)}>
              <option value="">— select Snowflake —</option>
              {sfConns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={claudeId} onChange={e => setClaudeId(e.target.value)}>
              <option value="">— select Claude —</option>
              {clConns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="dataset-dialog-header-actions">
            <button onClick={handleSave} disabled={!canSave || saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button aria-label="Close" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Body: two columns */}
        <div className="dataset-dialog-body">
          <div className="dataset-dialog-left">
            <textarea
              className="dataset-dialog-sql"
              placeholder="SQL query…"
              value={sql}
              onChange={e => setSql(e.target.value)}
            />
            <div className={`dataset-dialog-run-panel${resultsOpen ? ' is-open' : ''}`}>
              <div className="dataset-dialog-run-bar">
                <button onClick={handleRun} disabled={!canRun || running}>Run</button>
                {running && <button onClick={handleCancel}>Cancel</button>}
                <button
                  className="run-toggle-btn"
                  aria-label={resultsOpen ? 'Collapse results' : 'Expand results'}
                  onClick={() => setResultsOpen(o => !o)}
                >
                  {resultsOpen ? '▼' : '▲'}
                </button>
              </div>
              {resultsOpen && (
                <>
                  {running && <div role="status" className="run-spinner">Loading…</div>}
                  {runError && <p data-testid="run-error" className="run-error">{runError}</p>}
                  {runResult && (
                    <div className="run-results">
                      <div data-testid="run-metadata" className="run-metadata">
                        {runResult.row_count} rows · {runResult.duration_ms}ms · {runResult.executed_at}
                      </div>
                      <div className="run-results-scroll">
                        <table>
                          <thead>
                            <tr>{runResult.columns.map(col => <th key={col}>{col}</th>)}</tr>
                          </thead>
                          <tbody>
                            {runResult.rows.map((row, i) => (
                              <tr key={i}>{row.map((cell, j) => <td key={j}>{String(cell)}</td>)}</tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="dataset-dialog-right">
            <div className="dataset-dialog-chat-placeholder" data-testid="dialog-chat-placeholder" />
          </div>
        </div>
      </div>
    </div>
  )
}
