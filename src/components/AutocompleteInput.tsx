import { useEffect, useRef, useState } from 'react'
import { SchemaParams, apiGetSchema } from '../api/explore'

interface Props {
  connectionId: string
  loading: boolean
  onSend: (message: string) => void
}

const LEVEL_LABEL: Record<string, string> = {
  databases: 'DATABASE',
  schemas: 'SCHEMA',
  tables: 'TABLE',
  columns: 'COLUMN',
}

function getLastWord(input: string): string {
  const parts = input.split(' ')
  return parts[parts.length - 1]
}

interface ParsedToken {
  params: Omit<SchemaParams, 'connection_id'>
  filter: string
}

function parseToken(input: string): ParsedToken | null {
  const lastWord = getLastWord(input)

  let path: string
  if (lastWord.startsWith('data:')) {
    path = lastWord.slice(5)
  } else if (lastWord.includes('.')) {
    path = lastWord
  } else {
    return null
  }

  const allParts = path.split('.')
  const filter = allParts[allParts.length - 1]
  const contextParts = allParts.slice(0, -1).filter(Boolean)

  let level: SchemaParams['level']
  if (contextParts.length === 0) level = 'databases'
  else if (contextParts.length === 1) level = 'schemas'
  else if (contextParts.length === 2) level = 'tables'
  else level = 'columns'

  return {
    params: {
      level,
      database: contextParts[0],
      schema: contextParts[1],
      table: contextParts[2],
    },
    filter,
  }
}

function insertSuggestion(input: string, suggestion: string): string {
  const words = input.split(' ')
  const lastWord = words[words.length - 1]
  const dotIdx = lastWord.lastIndexOf('.')
  if (dotIdx !== -1) {
    words[words.length - 1] = lastWord.slice(0, dotIdx + 1) + suggestion
  } else {
    // lastWord is `data:` with no dot yet — append the suggestion directly
    words[words.length - 1] = lastWord + suggestion
  }
  return words.join(' ')
}

export function AutocompleteInput({ connectionId, loading, onSend }: Props) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [currentLevel, setCurrentLevel] = useState<string>('databases')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const cacheRef = useRef<Map<string, string[]>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset selection when new suggestions arrive
  useEffect(() => {
    setSelectedIndex(0)
  }, [suggestions])

  // Debounced fetch
  useEffect(() => {
    const token = parseToken(input)
    if (!token || loading) {
      setIsOpen(false)
      return
    }
    const { params, filter } = token
    const cacheKey = JSON.stringify({ connection_id: connectionId, ...params })

    const timer = setTimeout(async () => {
      let items: string[]
      if (cacheRef.current.has(cacheKey)) {
        items = cacheRef.current.get(cacheKey)!
      } else {
        items = await apiGetSchema({ connection_id: connectionId, ...params })
        cacheRef.current.set(cacheKey, items)
      }
      const filtered = filter
        ? items.filter(i => i.toLowerCase().startsWith(filter.toLowerCase()))
        : items
      setSuggestions(filtered.slice(0, 10))
      setCurrentLevel(params.level)
      setIsOpen(true)
    }, 200)

    return () => clearTimeout(timer)
  }, [input, loading, connectionId])

  // Click-outside to close
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  function pickSuggestion(suggestion: string) {
    setInput(insertSuggestion(input, suggestion))
    setIsOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault()
        if (suggestions.length > 0) pickSuggestion(suggestions[selectedIndex])
        return
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!input.trim() || loading) return
      onSend(input)
      setInput('')
    }
  }

  function handleSend() {
    if (!input.trim() || loading) return
    onSend(input)
    setInput('')
  }

  const typeLabel = LEVEL_LABEL[currentLevel] ?? 'OBJECT'

  return (
    <div className="autocomplete-wrap" ref={containerRef}>
      {isOpen && suggestions.length > 0 && (
        <ul role="listbox" className="autocomplete-dropdown">
          {suggestions.map((s, i) => (
            <li
              key={i}
              role="option"
              aria-selected={i === selectedIndex}
              className={`autocomplete-option${i === selectedIndex ? ' autocomplete-option--active' : ''}`}
              onMouseEnter={() => setSelectedIndex(i)}
              onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s) }}
            >
              <span className="autocomplete-option__name">{s}</span>
              <span className="autocomplete-option__type">{typeLabel}</span>
            </li>
          ))}
        </ul>
      )}
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
