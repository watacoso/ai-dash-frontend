import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeAll } from 'vitest'
import { ExploreChat } from './ExploreChat'

vi.mock('../api/explore', () => ({
  apiGetSchema: vi.fn().mockResolvedValue([]),
  apiExploreChat: vi.fn(),
}))

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
})

const MESSAGES = [
  { role: 'user', content: 'What databases do I have?' },
  { role: 'assistant', content: 'You have DB1 and DB2.' },
]

describe('ExploreChat', () => {
  it('should render user and assistant messages', () => {
    render(<ExploreChat messages={MESSAGES} loading={false} onSend={vi.fn()} connectionId="sf-1" />)
    expect(screen.getByText('What databases do I have?')).toBeInTheDocument()
    expect(screen.getByText('You have DB1 and DB2.')).toBeInTheDocument()
  })

  it('should disable send button when input is empty', () => {
    render(<ExploreChat messages={[]} loading={false} onSend={vi.fn()} connectionId="sf-1" />)
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
  })

  it('should disable send button when loading is true', () => {
    render(<ExploreChat messages={[]} loading={true} onSend={vi.fn()} connectionId="sf-1" />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } })
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
  })

  it('should disable input when loading is true', () => {
    render(<ExploreChat messages={[]} loading={true} onSend={vi.fn()} connectionId="sf-1" />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('should call onSend with input text when send button clicked', () => {
    const onSend = vi.fn()
    render(<ExploreChat messages={[]} loading={false} onSend={onSend} connectionId="sf-1" />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(onSend).toHaveBeenCalledWith('hello')
  })

  it('should call onSend when Enter is pressed', () => {
    const onSend = vi.fn()
    render(<ExploreChat messages={[]} loading={false} onSend={onSend} connectionId="sf-1" />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } })
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', shiftKey: false })
    expect(onSend).toHaveBeenCalledWith('hello')
  })

  it('should not call onSend when Shift+Enter is pressed', () => {
    const onSend = vi.fn()
    render(<ExploreChat messages={[]} loading={false} onSend={onSend} connectionId="sf-1" />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } })
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', shiftKey: true })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('should clear input after send', () => {
    render(<ExploreChat messages={[]} loading={false} onSend={vi.fn()} connectionId="sf-1" />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'hello' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(input).toHaveValue('')
  })

  it('should render assistant message markdown as HTML', () => {
    // Arrange
    const messages = [{ role: 'assistant', content: 'This is **bold** text.' }]
    // Act
    render(<ExploreChat messages={messages} loading={false} onSend={vi.fn()} connectionId="sf-1" />)
    // Assert — bold markdown rendered as <strong>
    expect(document.querySelector('strong')).toBeInTheDocument()
  })

  it('should render markdown headings in assistant messages', () => {
    // Arrange
    const messages = [{ role: 'assistant', content: '## My Heading' }]
    // Act
    render(<ExploreChat messages={messages} loading={false} onSend={vi.fn()} connectionId="sf-1" />)
    // Assert
    expect(screen.getByRole('heading', { name: 'My Heading' })).toBeInTheDocument()
  })

  it('should render markdown tables in assistant messages', () => {
    // Arrange
    const messages = [{ role: 'assistant', content: '| Col A | Col B |\n|---|---|\n| 1 | 2 |' }]
    // Act
    render(<ExploreChat messages={messages} loading={false} onSend={vi.fn()} connectionId="sf-1" />)
    // Assert
    expect(document.querySelector('table')).toBeInTheDocument()
  })

  it('should render user messages as plain text without markdown processing', () => {
    // Arrange
    const messages = [{ role: 'user', content: '**not bold**' }]
    // Act
    render(<ExploreChat messages={messages} loading={false} onSend={vi.fn()} connectionId="sf-1" />)
    // Assert — raw text visible, no <strong> element
    expect(screen.getByText('**not bold**')).toBeInTheDocument()
    expect(document.querySelector('strong')).not.toBeInTheDocument()
  })

  it('should scroll latest message into view when messages change', () => {
    const { rerender } = render(
      <ExploreChat messages={MESSAGES.slice(0, 1)} loading={false} onSend={vi.fn()} connectionId="sf-1" />
    )
    rerender(<ExploreChat messages={MESSAGES} loading={false} onSend={vi.fn()} connectionId="sf-1" />)
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
  })

  // --- TKT-0019: Export button ---

  it('should not render Export button when messages is empty', () => {
    render(<ExploreChat messages={[]} loading={false} onSend={vi.fn()} connectionId="sf-1" logs={[]} />)
    expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument()
  })

  it('should render Export button when at least one message exists', () => {
    render(<ExploreChat messages={MESSAGES} loading={false} onSend={vi.fn()} connectionId="sf-1" logs={[]} />)
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
  })

  it('should copy structured text to clipboard on Export click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    const logs = [{ level: 'ERROR', message: 'db error' }]
    render(<ExploreChat messages={MESSAGES} loading={false} onSend={vi.fn()} connectionId="sf-1" logs={logs} />)
    fireEvent.click(screen.getByRole('button', { name: /export/i }))
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce())
    const text: string = writeText.mock.calls[0][0]
    expect(text).toContain('[User]')
    expect(text).toContain('[Assistant]')
    expect(text).toContain('## Logs')
  })

  it('should format user messages with [User] prefix', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<ExploreChat messages={MESSAGES} loading={false} onSend={vi.fn()} connectionId="sf-1" logs={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /export/i }))
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce())
    const text: string = writeText.mock.calls[0][0]
    expect(text).toContain('[User]\nWhat databases do I have?')
  })

  it('should format assistant messages with [Assistant] prefix', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<ExploreChat messages={MESSAGES} loading={false} onSend={vi.fn()} connectionId="sf-1" logs={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /export/i }))
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce())
    const text: string = writeText.mock.calls[0][0]
    expect(text).toContain('[Assistant]\nYou have DB1 and DB2.')
  })

  it('should append ## Logs section with level and message', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    const logs = [{ level: 'ERROR', message: 'db err' }]
    render(<ExploreChat messages={MESSAGES} loading={false} onSend={vi.fn()} connectionId="sf-1" logs={logs} />)
    fireEvent.click(screen.getByRole('button', { name: /export/i }))
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce())
    const text: string = writeText.mock.calls[0][0]
    expect(text).toContain('## Logs\n[ERROR] db err')
  })

  it('should show confirmation text after successful copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<ExploreChat messages={MESSAGES} loading={false} onSend={vi.fn()} connectionId="sf-1" logs={[]} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /export/i }))
    })
    expect(screen.getByText(/copied/i)).toBeInTheDocument()
  })

  it('should hide confirmation after 3 seconds', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<ExploreChat messages={MESSAGES} loading={false} onSend={vi.fn()} connectionId="sf-1" logs={[]} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /export/i }))
    })
    expect(screen.getByText(/copied/i)).toBeInTheDocument()
    await act(async () => { vi.advanceTimersByTime(3000) })
    expect(screen.queryByText(/copied/i)).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  // --- TKT-0020: Debug panel toggle ---

  it('should render Debug toggle button', () => {
    render(<ExploreChat messages={MESSAGES} loading={false} onSend={vi.fn()} connectionId="sf-1" logs={[]} onClearLogs={vi.fn()} />)
    expect(screen.getByRole('button', { name: /debug/i })).toBeInTheDocument()
  })

  it('should open debug panel when Debug is clicked', () => {
    render(<ExploreChat messages={MESSAGES} loading={false} onSend={vi.fn()} connectionId="sf-1" logs={[]} onClearLogs={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /debug/i }))
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })

  it('should close debug panel when Debug is clicked again', () => {
    render(<ExploreChat messages={MESSAGES} loading={false} onSend={vi.fn()} connectionId="sf-1" logs={[]} onClearLogs={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /debug/i }))
    fireEvent.click(screen.getByRole('button', { name: /debug/i }))
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('should pass logs to DebugPanel when open', () => {
    const logs = [{ level: 'ERROR', message: 'something broke' }]
    render(<ExploreChat messages={MESSAGES} loading={false} onSend={vi.fn()} connectionId="sf-1" logs={logs} onClearLogs={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /debug/i }))
    expect(screen.getByText('something broke')).toBeInTheDocument()
  })

  it('should call onClearLogs when panel Clear is clicked', () => {
    const onClearLogs = vi.fn()
    render(<ExploreChat messages={MESSAGES} loading={false} onSend={vi.fn()} connectionId="sf-1" logs={[]} onClearLogs={onClearLogs} />)
    fireEvent.click(screen.getByRole('button', { name: /debug/i }))
    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(onClearLogs).toHaveBeenCalledOnce()
  })

  // --- TKT-0030: Create dataset button ---

  it('should not show Create dataset button on user message', () => {
    const msgs = [{ role: 'user', content: '```sql\nSELECT 1\n```' }]
    render(<ExploreChat messages={msgs} loading={false} onSend={vi.fn()} connectionId="sf-1" onCreateDataset={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /create dataset/i })).not.toBeInTheDocument()
  })

  it('should not show Create dataset button on assistant message without SQL', () => {
    const msgs = [{ role: 'assistant', content: 'Here is some plain text.' }]
    render(<ExploreChat messages={msgs} loading={false} onSend={vi.fn()} connectionId="sf-1" onCreateDataset={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /create dataset/i })).not.toBeInTheDocument()
  })

  it('should show Create dataset button on assistant message with tagged sql block', () => {
    const msgs = [{ role: 'assistant', content: '```sql\nSELECT 1\n```' }]
    render(<ExploreChat messages={msgs} loading={false} onSend={vi.fn()} connectionId="sf-1" onCreateDataset={vi.fn()} />)
    expect(screen.getByRole('button', { name: /create dataset/i })).toBeInTheDocument()
  })

  it('should show Create dataset button on assistant message with single untagged code block', () => {
    const msgs = [{ role: 'assistant', content: '```\nSELECT 1\n```' }]
    render(<ExploreChat messages={msgs} loading={false} onSend={vi.fn()} connectionId="sf-1" onCreateDataset={vi.fn()} />)
    expect(screen.getByRole('button', { name: /create dataset/i })).toBeInTheDocument()
  })

  it('should not show Create dataset button when multiple untagged code blocks present', () => {
    const msgs = [{ role: 'assistant', content: '```\nSELECT 1\n```\n\n```\nSELECT 2\n```' }]
    render(<ExploreChat messages={msgs} loading={false} onSend={vi.fn()} connectionId="sf-1" onCreateDataset={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /create dataset/i })).not.toBeInTheDocument()
  })

  it('should call onCreateDataset with extracted sql when Create dataset clicked', () => {
    const onCreateDataset = vi.fn()
    const msgs = [{ role: 'assistant', content: '```sql\nSELECT 1\n```' }]
    render(<ExploreChat messages={msgs} loading={false} onSend={vi.fn()} connectionId="sf-1" onCreateDataset={onCreateDataset} />)
    fireEvent.click(screen.getByRole('button', { name: /create dataset/i }))
    expect(onCreateDataset).toHaveBeenCalledWith('SELECT 1')
  })
})
