import { render, screen, fireEvent } from '@testing-library/react'
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
})
