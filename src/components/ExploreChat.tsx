import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { LogEntry } from '../api/explore'
import { AutocompleteInput } from './AutocompleteInput'

interface Message {
  role: string
  content: string
}

interface Props {
  messages: Message[]
  loading: boolean
  onSend: (message: string) => void
  connectionId: string
  logs?: LogEntry[]
}

function buildExportText(messages: Message[], logs: LogEntry[]): string {
  const chat = messages
    .map((m) => `[${m.role === 'user' ? 'User' : 'Assistant'}]\n${m.content}`)
    .join('\n\n')
  const logSection =
    logs.length > 0
      ? `\n\n## Logs\n${logs.map((l) => `[${l.level}] ${l.message}`).join('\n')}`
      : '\n\n## Logs\n(none)'
  return chat + logSection
}

export function ExploreChat({ messages, loading, onSend, connectionId, logs = [] }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleExport() {
    await navigator.clipboard.writeText(buildExportText(messages, logs))
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="chat">
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className="chat-bubble" data-role={msg.role}>
            {msg.role === 'assistant' ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            ) : (
              msg.content
            )}
          </div>
        ))}
        {loading && <div className="chat-thinking">Thinking…</div>}
        <div ref={bottomRef} />
      </div>
      {messages.length > 0 && (
        <div className="chat-toolbar">
          <button className="btn-secondary" onClick={handleExport}>Export chat</button>
          {copied && <span className="chat-copied">Copied!</span>}
        </div>
      )}
      <AutocompleteInput connectionId={connectionId} loading={loading} onSend={onSend} />
    </div>
  )
}
