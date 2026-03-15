import { render, screen, fireEvent, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AutocompleteInput } from './AutocompleteInput'
import { apiGetSchema } from '../api/explore'

vi.mock('../api/explore', () => ({
  apiGetSchema: vi.fn(),
  apiExploreChat: vi.fn(),
}))

const mockApiGetSchema = vi.mocked(apiGetSchema)

async function advanceDebounce() {
  await act(async () => {
    vi.advanceTimersByTime(200)
  })
}

describe('AutocompleteInput', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockApiGetSchema.mockResolvedValue([
      'DB1', 'DB2', 'DB3', 'DB4', 'DB5',
      'DB6', 'DB7', 'DB8', 'DB9', 'DB10', 'DB11',
    ])
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('should show dropdown when data: is typed', async () => {
    // Arrange
    render(<AutocompleteInput connectionId="sf-1" loading={false} onSend={vi.fn()} />)
    // Act
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'data:' } })
    await advanceDebounce()
    // Assert
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('should not show dropdown for plain text without data: or dot', async () => {
    // Arrange
    render(<AutocompleteInput connectionId="sf-1" loading={false} onSend={vi.fn()} />)
    // Act
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'my' } })
    await advanceDebounce()
    // Assert
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('should show dropdown when dot is typed after a word', async () => {
    // Arrange
    render(<AutocompleteInput connectionId="sf-1" loading={false} onSend={vi.fn()} />)
    // Act
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'DB_A.' } })
    await advanceDebounce()
    // Assert
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('should call apiGetSchema with level=databases for data:', async () => {
    // Arrange
    render(<AutocompleteInput connectionId="sf-1" loading={false} onSend={vi.fn()} />)
    // Act
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'data:' } })
    await advanceDebounce()
    // Assert
    expect(mockApiGetSchema).toHaveBeenCalledWith(
      expect.objectContaining({ connection_id: 'sf-1', level: 'databases' })
    )
  })

  it('should call apiGetSchema with level=schemas for data:MYDB.', async () => {
    // Arrange
    render(<AutocompleteInput connectionId="sf-1" loading={false} onSend={vi.fn()} />)
    // Act
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'data:MYDB.' } })
    await advanceDebounce()
    // Assert
    expect(mockApiGetSchema).toHaveBeenCalledWith(
      expect.objectContaining({ connection_id: 'sf-1', level: 'schemas', database: 'MYDB' })
    )
  })

  it('should call apiGetSchema with level=tables for data:MYDB.PUB.', async () => {
    // Arrange
    render(<AutocompleteInput connectionId="sf-1" loading={false} onSend={vi.fn()} />)
    // Act
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'data:MYDB.PUB.' } })
    await advanceDebounce()
    // Assert
    expect(mockApiGetSchema).toHaveBeenCalledWith(
      expect.objectContaining({ connection_id: 'sf-1', level: 'tables', database: 'MYDB', schema: 'PUB' })
    )
  })

  it('should call apiGetSchema with level=schemas when dot follows database name', async () => {
    // Arrange
    render(<AutocompleteInput connectionId="sf-1" loading={false} onSend={vi.fn()} />)
    // Act
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'DB_A.' } })
    await advanceDebounce()
    // Assert
    expect(mockApiGetSchema).toHaveBeenCalledWith(
      expect.objectContaining({ connection_id: 'sf-1', level: 'schemas', database: 'DB_A' })
    )
  })

  it('should call apiGetSchema with level=tables for DB_A.SCHEMA_1.', async () => {
    // Arrange
    render(<AutocompleteInput connectionId="sf-1" loading={false} onSend={vi.fn()} />)
    // Act
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'DB_A.SCHEMA_1.' } })
    await advanceDebounce()
    // Assert
    expect(mockApiGetSchema).toHaveBeenCalledWith(
      expect.objectContaining({ connection_id: 'sf-1', level: 'tables', database: 'DB_A', schema: 'SCHEMA_1' })
    )
  })

  it('should show at most 10 suggestions', async () => {
    // Arrange — mock returns 11 items
    render(<AutocompleteInput connectionId="sf-1" loading={false} onSend={vi.fn()} />)
    // Act
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'data:' } })
    await advanceDebounce()
    // Assert
    expect(screen.getAllByRole('option')).toHaveLength(10)
  })

  it('should insert suggestion after data: prefix on Tab', async () => {
    // Arrange
    mockApiGetSchema.mockResolvedValue(['DB1', 'DB2'])
    render(<AutocompleteInput connectionId="sf-1" loading={false} onSend={vi.fn()} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'data:' } })
    await advanceDebounce()
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    // Act
    fireEvent.keyDown(input, { key: 'Tab' })
    // Assert
    expect(input).toHaveValue('data:DB1')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('should insert suggestion after dot on Tab', async () => {
    // Arrange
    mockApiGetSchema.mockResolvedValue(['SCHEMA1', 'SCHEMA2'])
    render(<AutocompleteInput connectionId="sf-1" loading={false} onSend={vi.fn()} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'DB_A.' } })
    await advanceDebounce()
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    // Act
    fireEvent.keyDown(input, { key: 'Tab' })
    // Assert
    expect(input).toHaveValue('DB_A.SCHEMA1')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('should insert suggestion on Enter when dropdown is open', async () => {
    // Arrange
    mockApiGetSchema.mockResolvedValue(['DB1', 'DB2'])
    render(<AutocompleteInput connectionId="sf-1" loading={false} onSend={vi.fn()} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'data:' } })
    await advanceDebounce()
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    // Act
    fireEvent.keyDown(input, { key: 'Enter' })
    // Assert
    expect(input).toHaveValue('data:DB1')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('should close dropdown on Escape', async () => {
    // Arrange
    render(<AutocompleteInput connectionId="sf-1" loading={false} onSend={vi.fn()} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'data:' } })
    await advanceDebounce()
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    // Act
    fireEvent.keyDown(input, { key: 'Escape' })
    // Assert
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('should close dropdown on click outside', async () => {
    // Arrange
    render(<AutocompleteInput connectionId="sf-1" loading={false} onSend={vi.fn()} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'data:' } })
    await advanceDebounce()
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    // Act
    fireEvent.mouseDown(document.body)
    // Assert
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('should not fetch while loading prop is true', async () => {
    // Arrange
    render(<AutocompleteInput connectionId="sf-1" loading={true} onSend={vi.fn()} />)
    // Act
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'data:' } })
    await advanceDebounce()
    // Assert
    expect(mockApiGetSchema).not.toHaveBeenCalled()
  })

  it('should debounce fetch — not called immediately, called after 200ms', async () => {
    // Arrange
    render(<AutocompleteInput connectionId="sf-1" loading={false} onSend={vi.fn()} />)
    // Act
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'data:' } })
    // Assert — not yet
    expect(mockApiGetSchema).not.toHaveBeenCalled()
    await advanceDebounce()
    // Assert — fired after 200ms
    expect(mockApiGetSchema).toHaveBeenCalledTimes(1)
  })

  it('should use cached result for same prefix without re-fetching', async () => {
    // Arrange
    mockApiGetSchema.mockResolvedValue(['DB1', 'DB2'])
    render(<AutocompleteInput connectionId="sf-1" loading={false} onSend={vi.fn()} />)
    const input = screen.getByRole('textbox')
    // Act — first type
    fireEvent.change(input, { target: { value: 'data:' } })
    await advanceDebounce()
    expect(mockApiGetSchema).toHaveBeenCalledTimes(1)
    // Act — clear and retype same prefix
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.change(input, { target: { value: 'data:' } })
    await advanceDebounce()
    // Assert — still only one fetch
    expect(mockApiGetSchema).toHaveBeenCalledTimes(1)
  })

  it('should move selection down on ArrowDown', async () => {
    // Arrange
    mockApiGetSchema.mockResolvedValue(['DB1', 'DB2', 'DB3'])
    render(<AutocompleteInput connectionId="sf-1" loading={false} onSend={vi.fn()} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'data:' } })
    await advanceDebounce()
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    // Act
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    // Assert — second option (index 1) has active class
    const options = screen.getAllByRole('option')
    expect(options[1]).toHaveClass('autocomplete-option--active')
    expect(options[0]).not.toHaveClass('autocomplete-option--active')
  })

  it('should insert arrow-selected suggestion on Enter', async () => {
    // Arrange
    mockApiGetSchema.mockResolvedValue(['DB1', 'DB2', 'DB3'])
    render(<AutocompleteInput connectionId="sf-1" loading={false} onSend={vi.fn()} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'data:' } })
    await advanceDebounce()
    // Act — move down once then Enter
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    // Assert
    expect(input).toHaveValue('data:DB2')
  })
})
