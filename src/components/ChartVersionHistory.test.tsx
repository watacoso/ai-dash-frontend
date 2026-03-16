import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { ChartVersionHistory } from './ChartVersionHistory'
import { ChartVersion } from '../api/charts'

const versions: ChartVersion[] = [
  { version: 0, d3_code: "d3.select('svg');", accepted: false, created_at: '2026-03-16T10:00:00Z' },
  { version: 1, d3_code: "d3.select('svg').append('circle');", accepted: true, created_at: '2026-03-16T11:00:00Z' },
]

describe('ChartVersionHistory', () => {
  it('should show empty state when versions array is empty', () => {
    // Arrange / Act
    render(<ChartVersionHistory versions={[]} onAccept={vi.fn()} onPreview={vi.fn()} />)
    // Assert
    expect(screen.getByText(/no versions yet/i)).toBeInTheDocument()
  })

  it('should render a row per version with number and timestamp', () => {
    // Arrange / Act
    render(<ChartVersionHistory versions={versions} onAccept={vi.fn()} onPreview={vi.fn()} />)
    // Assert
    expect(screen.getByText(/v0/i)).toBeInTheDocument()
    expect(screen.getByText(/v1/i)).toBeInTheDocument()
  })

  it('should show accepted badge on accepted version', () => {
    // Arrange / Act
    render(<ChartVersionHistory versions={versions} onAccept={vi.fn()} onPreview={vi.fn()} />)
    // Assert
    expect(screen.getByText(/accepted/i)).toBeInTheDocument()
  })

  it('should call onAccept with version index when Accept clicked', () => {
    // Arrange
    const onAccept = vi.fn()
    render(<ChartVersionHistory versions={versions} onAccept={onAccept} onPreview={vi.fn()} />)
    // Act — click Accept on first version (index 0)
    fireEvent.click(screen.getAllByRole('button', { name: /accept/i })[0])
    // Assert
    expect(onAccept).toHaveBeenCalledWith(0)
  })

  it('should call onPreview with d3_code when version row clicked', () => {
    // Arrange
    const onPreview = vi.fn()
    render(<ChartVersionHistory versions={versions} onAccept={vi.fn()} onPreview={onPreview} />)
    // Act
    fireEvent.click(screen.getByText(/v0/i))
    // Assert
    expect(onPreview).toHaveBeenCalledWith("d3.select('svg');")
  })
})
