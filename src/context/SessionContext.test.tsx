import { render, screen, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SessionProvider, useSession } from './SessionContext'

function TestConsumer() {
  const { snowflakeId, claudeId, setSnowflakeId, setClaudeId } = useSession()
  return (
    <div>
      <span data-testid="sf">{snowflakeId ?? 'null'}</span>
      <span data-testid="cl">{claudeId ?? 'null'}</span>
      <button onClick={() => setSnowflakeId('sf-1')}>set sf</button>
      <button onClick={() => setClaudeId('cl-1')}>set cl</button>
    </div>
  )
}

describe('SessionContext', () => {
  it('initial state has no connections selected', () => {
    render(<SessionProvider><TestConsumer /></SessionProvider>)
    expect(screen.getByTestId('sf')).toHaveTextContent('null')
    expect(screen.getByTestId('cl')).toHaveTextContent('null')
  })

  it('setSnowflakeId updates snowflake selection', () => {
    render(<SessionProvider><TestConsumer /></SessionProvider>)
    act(() => { screen.getByRole('button', { name: 'set sf' }).click() })
    expect(screen.getByTestId('sf')).toHaveTextContent('sf-1')
  })

  it('setClaudeId updates claude selection', () => {
    render(<SessionProvider><TestConsumer /></SessionProvider>)
    act(() => { screen.getByRole('button', { name: 'set cl' }).click() })
    expect(screen.getByTestId('cl')).toHaveTextContent('cl-1')
  })
})
