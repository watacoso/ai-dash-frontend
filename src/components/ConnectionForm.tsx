import { useState } from 'react'
import { ConnectionRow, apiCreateConnection, apiUpdateConnection } from '../api/connections'

interface Props {
  initial?: ConnectionRow
  onSuccess: () => void
  onCancel: () => void
}

const CLAUDE_MODELS = ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5']

function isComplete(name: string, type: string, creds: Record<string, string>): boolean {
  if (!name.trim()) return false
  if (type === 'snowflake') {
    return ['account', 'username', 'private_key', 'warehouse', 'database', 'schema'].every(
      (k) => !!creds[k]?.trim()
    )
  }
  return !!(creds.api_key?.trim() && creds.model?.trim())
}

export function ConnectionForm({ initial, onSuccess, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<'snowflake' | 'claude'>(initial?.type ?? 'snowflake')
  const [creds, setCreds] = useState<Record<string, string>>({
    account: '', username: '', private_key: '', warehouse: '', database: '', schema: '',
    api_key: '', model: CLAUDE_MODELS[1],
  })
  const [saving, setSaving] = useState(false)

  const isEdit = !!initial
  const canSave = isComplete(name, type, creds)

  function setField(key: string, value: string) {
    setCreds((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    try {
      const credentials =
        type === 'snowflake'
          ? { account: creds.account, username: creds.username, private_key: creds.private_key,
              warehouse: creds.warehouse, database: creds.database, schema: creds.schema }
          : { api_key: creds.api_key, model: creds.model }

      if (isEdit) {
        await apiUpdateConnection(initial!.id, { name, credentials })
      } else {
        await apiCreateConnection({ name, type, credentials })
      }
      onSuccess()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="conn-name">Name</label>
        <input id="conn-name" aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div>
        <label htmlFor="conn-type">Type</label>
        <select
          id="conn-type"
          aria-label="Type"
          value={type}
          disabled={isEdit}
          onChange={(e) => setType(e.target.value as 'snowflake' | 'claude')}
        >
          <option value="snowflake">Snowflake</option>
          <option value="claude">Claude</option>
        </select>
      </div>

      {type === 'snowflake' ? (
        <>
          <div>
            <label htmlFor="sf-account">Account</label>
            <input id="sf-account" aria-label="Account" value={creds.account} onChange={(e) => setField('account', e.target.value)} />
          </div>
          <div>
            <label htmlFor="sf-username">Username</label>
            <input id="sf-username" aria-label="Username" value={creds.username} onChange={(e) => setField('username', e.target.value)} />
          </div>
          <div>
            <label htmlFor="sf-pk">Private key</label>
            <textarea id="sf-pk" aria-label="Private key" value={creds.private_key} onChange={(e) => setField('private_key', e.target.value)} />
          </div>
          <div>
            <label htmlFor="sf-wh">Warehouse</label>
            <input id="sf-wh" aria-label="Warehouse" value={creds.warehouse} onChange={(e) => setField('warehouse', e.target.value)} />
          </div>
          <div>
            <label htmlFor="sf-db">Database</label>
            <input id="sf-db" aria-label="Database" value={creds.database} onChange={(e) => setField('database', e.target.value)} />
          </div>
          <div>
            <label htmlFor="sf-schema">Schema</label>
            <input id="sf-schema" aria-label="Schema" value={creds.schema} onChange={(e) => setField('schema', e.target.value)} />
          </div>
        </>
      ) : (
        <>
          <div>
            <label htmlFor="cl-key">API key</label>
            <input id="cl-key" aria-label="API key" type="password" value={creds.api_key} onChange={(e) => setField('api_key', e.target.value)} />
          </div>
          <div>
            <label htmlFor="cl-model">Model</label>
            <select id="cl-model" aria-label="Model" value={creds.model} onChange={(e) => setField('model', e.target.value)}>
              {CLAUDE_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </>
      )}

      <button type="submit" disabled={!canSave || saving}>Save</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </form>
  )
}
