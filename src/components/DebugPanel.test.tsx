import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { DebugPanel } from './DebugPanel'

const LOGS = [
  { level: 'INFO', message: 'Tool call: get_schema(level=databases)' },
  { level: 'ERROR', message: 'auth failed' },
]

describe('DebugPanel', () => {
  it('should not render log entries when closed', () => {
    // Arrange / Act
    render(<DebugPanel open={false} logs={LOGS} onClear={vi.fn()} />)
    // Assert
    expect(screen.queryByText('Tool call: get_schema(level=databases)')).not.toBeInTheDocument()
  })

  it('should render log entries when open', () => {
    // Arrange / Act
    render(<DebugPanel open={true} logs={LOGS} onClear={vi.fn()} />)
    // Assert
    expect(screen.getByText('Tool call: get_schema(level=databases)')).toBeInTheDocument()
    expect(screen.getByText('auth failed')).toBeInTheDocument()
  })

  it('should apply error class to ERROR entries', () => {
    // Arrange / Act
    render(<DebugPanel open={true} logs={LOGS} onClear={vi.fn()} />)
    // Assert — ERROR entry has the error modifier class
    const errorEntry = screen.getByText('auth failed').closest('[data-level]')
    expect(errorEntry).toHaveAttribute('data-level', 'ERROR')
  })

  it('should not apply error attribute to INFO entries', () => {
    // Arrange / Act
    render(<DebugPanel open={true} logs={LOGS} onClear={vi.fn()} />)
    // Assert
    const infoEntry = screen.getByText('Tool call: get_schema(level=databases)').closest('[data-level]')
    expect(infoEntry).toHaveAttribute('data-level', 'INFO')
  })

  it('should call onClear when Clear button is clicked', () => {
    // Arrange
    const onClear = vi.fn()
    render(<DebugPanel open={true} logs={LOGS} onClear={onClear} />)
    // Act
    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    // Assert
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('should show empty state when no log entries', () => {
    // Arrange / Act
    render(<DebugPanel open={true} logs={[]} onClear={vi.fn()} />)
    // Assert
    expect(screen.getByText(/no logs yet/i)).toBeInTheDocument()
  })
})
