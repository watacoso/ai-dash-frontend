import { render, screen, act, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest'
import { D3Preview } from './D3Preview'

afterEach(() => { vi.restoreAllMocks() })

describe('D3Preview', () => {
  it('should render iframe when d3_code is provided', () => {
    // Arrange / Act
    render(<D3Preview d3Code="d3.select('svg');" />)
    // Assert
    expect(document.querySelector('iframe')).toBeInTheDocument()
  })

  it('should render placeholder when d3_code is empty', () => {
    // Arrange / Act
    render(<D3Preview d3Code="" />)
    // Assert
    expect(document.querySelector('iframe')).not.toBeInTheDocument()
    expect(screen.getByText(/no preview/i)).toBeInTheDocument()
  })

  it('should set iframe srcdoc containing the d3_code', () => {
    // Arrange
    const code = "d3.select('svg').append('circle');"
    // Act
    render(<D3Preview d3Code={code} />)
    // Assert
    const iframe = document.querySelector('iframe')!
    expect(iframe.getAttribute('srcdoc')).toContain(code)
  })

  it('should show render error banner when error message received via postMessage', async () => {
    // Arrange
    render(<D3Preview d3Code="d3.select('svg');" />)
    // Act — simulate iframe posting an error to the parent window
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', { data: { type: 'd3-error', message: 'ReferenceError: d3 is not defined' } })
      )
    })
    // Assert
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('alert')).toHaveTextContent(/ReferenceError/)
  })

  it('should clear error banner when new code prop arrives', async () => {
    // Arrange — show error first
    const { rerender } = render(<D3Preview d3Code="bad code" />)
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', { data: { type: 'd3-error', message: 'oops' } })
      )
    })
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    // Act — provide new code (triggers new render, clears error)
    rerender(<D3Preview d3Code="d3.select('svg').append('circle');" />)
    // Assert
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('should debounce re-render on rapid code changes', () => {
    // Arrange
    vi.useFakeTimers()
    const { rerender } = render(<D3Preview d3Code="v1" />)
    const srcdocAfterV1 = document.querySelector('iframe')!.getAttribute('srcdoc')
    // Act — rapid updates before debounce fires
    act(() => { rerender(<D3Preview d3Code="v2" />) })
    act(() => { rerender(<D3Preview d3Code="v3" />) })
    // Before debounce fires, srcdoc still reflects v1 (no update yet)
    expect(document.querySelector('iframe')!.getAttribute('srcdoc')).toBe(srcdocAfterV1)
    // Advance past debounce
    act(() => { vi.advanceTimersByTime(700) })
    // Assert — srcdoc now contains v3
    expect(document.querySelector('iframe')!.getAttribute('srcdoc')).toContain('v3')
    vi.useRealTimers()
  })
})
