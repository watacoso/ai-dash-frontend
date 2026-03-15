import { useState } from 'react'
import { ConnectionRow, apiCreateConnection, apiUpdateConnection } from '../api/connections'

interface Props {
  initial?: ConnectionRow
  onSuccess: () => void
  onCancel: () => void
}

const CLAUDE_MODELS = ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5']

const SF_REQUIRED = ['account', 'username', 'private_key', 'warehouse', 'database']

function sfCredsFilled(creds: Record<string, string>): boolean {
  return SF_REQUIRED.every((k) => !!creds[k]?.trim())
}

function isComplete(name: string, type: string, creds: Record<string, string>, isEdit: boolean): boolean {
  if (!name.trim()) return false
  if (isEdit) return true  // credentials optional in edit — kept on server if blank
  if (type === 'snowflake') return sfCredsFilled(creds)
  return !!(creds.api_key?.trim() && creds.model?.trim())
}

export function ConnectionForm({ initial, onSuccess, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<'snowflake' | 'claude'>(initial?.type ?? 'snowflake')
  const [creds, setCreds] = useState<Record<string, string>>({
    account: '', username: '', private_key: '', passphrase: '', warehouse: '', database: '',
    api_key: '', model: CLAUDE_MODELS[1],
  })
  const [saving, setSaving] = useState(false)

  const isEdit = !!initial
  const canSave = isComplete(name, type, creds, isEdit)

  function setField(key: string, value: string) {
    setCreds((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    try {
      let credentials: Record<string, string> | undefined
      if (type === 'snowflake' && sfCredsFilled(creds)) {
        credentials = {
          account: creds.account, username: creds.username, private_key: creds.private_key,
          warehouse: creds.warehouse, database: creds.database,
          ...(creds.passphrase.trim() ? { passphrase: creds.passphrase } : {}),
        }
      } else if (type === 'claude' && creds.api_key.trim()) {
        credentials = { api_key: creds.api_key, model: creds.model }
      }

      if (isEdit) {
        await apiUpdateConnection(initial!.id, { name, ...(credentials ? { credentials } : {}) })
      } else {
        await apiCreateConnection({ name, type, credentials: credentials! })
      }
      onSuccess()
    } finally {
      setSaving(false)
    }
  }

  const editPlaceholder = isEdit ? 'Leave blank to keep existing' : ''

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
            <input id="sf-account" aria-label="Account" value={creds.account} placeholder={editPlaceholder} onChange={(e) => setField('account', e.target.value)} />
          </div>
          <div>
            <label htmlFor="sf-username">Username</label>
            <input id="sf-username" aria-label="Username" value={creds.username} placeholder={editPlaceholder} onChange={(e) => setField('username', e.target.value)} />
          </div>
          <div>
            <label htmlFor="sf-pk">Private key</label>
            <textarea id="sf-pk" aria-label="Private key" value={creds.private_key} placeholder={editPlaceholder} onChange={(e) => setField('private_key', e.target.value)} />
          </div>
          <div>
            <label htmlFor="sf-passphrase">Passphrase <span>(optional)</span></label>
            <input id="sf-passphrase" aria-label="Passphrase" type="password" value={creds.passphrase} placeholder={editPlaceholder} onChange={(e) => setField('passphrase', e.target.value)} />
          </div>
          <div>
            <label htmlFor="sf-wh">Warehouse</label>
            <input id="sf-wh" aria-label="Warehouse" value={creds.warehouse} placeholder={editPlaceholder} onChange={(e) => setField('warehouse', e.target.value)} />
          </div>
          <div>
            <label htmlFor="sf-db">Database</label>
            <input id="sf-db" aria-label="Database" value={creds.database} placeholder={editPlaceholder} onChange={(e) => setField('database', e.target.value)} />
          </div>
        </>
      ) : (
        <>
          <div>
            <label htmlFor="cl-key">API key</label>
            <input id="cl-key" aria-label="API key" type="password" value={creds.api_key} placeholder={editPlaceholder} onChange={(e) => setField('api_key', e.target.value)} />
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
