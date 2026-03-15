import { useEffect, useRef, useState } from 'react'

interface Message {
  role: string
  content: string
}

interface Props {
  messages: Message[]
  loading: boolean
  onSend: (message: string) => void
}

export function ExploreChat({ messages, loading, onSend }: Props) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    if (!input.trim() || loading) return
    onSend(input)
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat">
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className="chat-bubble" data-role={msg.role}>
            {msg.content}
          </div>
        ))}
        {loading && <div className="chat-thinking">Thinking…</div>}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <textarea
          value={input}
          disabled={loading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your data…"
        />
        <button onClick={handleSend} disabled={!input.trim() || loading}>
          Send
        </button>
      </div>
    </div>
  )
}
