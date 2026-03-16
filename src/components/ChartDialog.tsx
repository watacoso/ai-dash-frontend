import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ConnectionRow, apiListConnections } from '../api/connections'
import { ChartRow } from '../api/charts'
import { DatasetRow, apiListDatasets } from '../api/datasets'

interface ChatMsg { role: string; content: string }

export interface ChartInitialValues {
  id?: string
  name: string
  datasource_id: string
  d3_code: string
  versions: ChartRow['versions']
  messages?: ChatMsg[]
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: (chart: ChartRow) => void
  initialValues?: ChartInitialValues
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

export function ChartDialog({ open, onClose, onSaved, initialValues }: Props) {
  const [datasets, setDatasets] = useState<DatasetRow[]>([])
  const [connections, setConnections] = useState<ConnectionRow[]>([])
  const [name, setName] = useState(initialValues?.name ?? '')
  const [datasourceId, setDatasourceId] = useState(initialValues?.datasource_id ?? '')
  const [d3Code, setD3Code] = useState(initialValues?.d3_code ?? '')
  const [saving, setSaving] = useState(false)

  const [chatMessages, setChatMessages] = useState<ChatMsg[]>(initialValues?.messages ?? [])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  const isEditMode = !!initialValues?.id
  const canSave = name.trim() !== '' && datasourceId !== ''

  useEffect(() => {
    if (open) {
      apiListDatasets().then(setDatasets)
      apiListConnections().then(setConnections)
    }
  }, [open])

  useEffect(() => {
    setName(initialValues?.name ?? '')
    setDatasourceId(initialValues?.datasource_id ?? '')
    setD3Code(initialValues?.d3_code ?? '')
    setChatMessages(initialValues?.messages ?? [])
  }, [initialValues])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }

  async function handleSave() {
    if (!canSave || saving) return
    setSaving(true)
    try {
      const body = { name: name.trim(), datasource_id: datasourceId, versions: initialValues?.versions ?? [] }
      const result = isEditMode
        ? await authFetch(`/api/charts/${initialValues!.id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await authFetch('/api/charts', { method: 'POST', body: JSON.stringify(body) })
      onSaved(result)
    } finally {
      setSaving(false)
    }
  }

  async function handleChatSend() {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    const userMsg: ChatMsg = { role: 'user', content: text }
    const nextMessages = [...chatMessages, userMsg]
    setChatMessages(nextMessages)
    setChatInput('')
    setChatLoading(true)

    const clConn = connections.find(c => c.type === 'claude')

    try {
      const url = initialValues?.id
        ? `/api/charts/${initialValues.id}/chat`
        : '/api/charts/chat'
      const data = await authFetch(url, {
        method: 'POST',
        body: JSON.stringify({
          claude_connection_id: clConn?.id ?? '',
          datasource_id: datasourceId,
          messages: nextMessages,
          d3_code: d3Code,
        }),
      })
      setChatMessages(prev => [...prev, { role: data.role, content: data.content }])
      if (data.d3_code_update) setD3Code(data.d3_code_update)
    } finally {
      setChatLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="chart-dialog-overlay"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="chart-dialog">
        {/* Header */}
        <div className="chart-dialog-header">
          <input
            className="chart-dialog-name"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <select value={datasourceId} onChange={e => setDatasourceId(e.target.value)}>
            <option value="">— select datasource —</option>
            {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <div className="chart-dialog-header-actions">
            <button className="btn-primary" onClick={handleSave} disabled={!canSave || saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="btn-secondary" aria-label="Close" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Body: left (D3 code) + right (chat) */}
        <div className="chart-dialog-body">
          <div className="chart-dialog-left">
            <textarea
              className="chart-dialog-d3"
              placeholder="D3 code…"
              value={d3Code}
              onChange={e => setD3Code(e.target.value)}
            />
            <div className="chart-dialog-preview-placeholder">
              {/* D3 SVG preview — filled in TKT-0042 */}
              <span>Preview coming soon</span>
            </div>
          </div>

          <div className="chart-dialog-right">
            <div className="chart-dialog-chat">
              <div className="chart-dialog-chat-messages">
                {chatMessages.map((msg, i) => (
                  <div key={i} className="dataset-chat-bubble" data-role={msg.role}>
                    {msg.role === 'assistant'
                      ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      : msg.content}
                  </div>
                ))}
                {chatLoading && (
                  <div data-testid="chat-spinner" className="dataset-chat-thinking">Thinking…</div>
                )}
                <div ref={chatBottomRef} />
              </div>
              <div className="chart-dialog-chat-input">
                <textarea
                  placeholder="Ask the AI…"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend() } }}
                  disabled={chatLoading}
                />
                <button
                  className="btn-primary"
                  onClick={handleChatSend}
                  disabled={!chatInput.trim() || chatLoading}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
