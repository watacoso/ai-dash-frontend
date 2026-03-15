import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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
}

export function ExploreChat({ messages, loading, onSend, connectionId }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
      <AutocompleteInput connectionId={connectionId} loading={loading} onSend={onSend} />
    </div>
  )
}
