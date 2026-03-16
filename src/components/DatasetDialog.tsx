import { useEffect, useState } from 'react'
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

  const modelsUsed = initialValues?.models_used ?? []
  const isEditMode = !!initialValues?.id
  const canSave = name.trim() !== '' && sql.trim() !== '' && snowflakeId !== ''

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
            <div className="dataset-dialog-run-placeholder" data-testid="dialog-run-placeholder" />
          </div>
          <div className="dataset-dialog-right">
            <div className="dataset-dialog-chat-placeholder" data-testid="dialog-chat-placeholder" />
          </div>
        </div>
      </div>
    </div>
  )
}
