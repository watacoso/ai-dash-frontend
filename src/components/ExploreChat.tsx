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
    <div>
      <div>
        {messages.map((msg, i) => (
          <div key={i} data-role={msg.role}>
            {msg.content}
          </div>
        ))}
        {loading && <div>Thinking…</div>}
        <div ref={bottomRef} />
      </div>

      <div>
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
