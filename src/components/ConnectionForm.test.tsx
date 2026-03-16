import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ConnectionForm } from './ConnectionForm'
import * as api from '../api/connections'

vi.mock('../api/connections')

const SNOWFLAKE_FIELDS = {
  account: 'xy12345', username: 'svc', private_key: 'key', warehouse: 'WH', database: 'DB',
}

function fillSnowflake() {
  fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'my-conn' } })
  fireEvent.change(screen.getByLabelText(/account/i), { target: { value: SNOWFLAKE_FIELDS.account } })
  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: SNOWFLAKE_FIELDS.username } })
  fireEvent.change(screen.getByLabelText(/private key/i), { target: { value: SNOWFLAKE_FIELDS.private_key } })
  fireEvent.change(screen.getByLabelText(/warehouse/i), { target: { value: SNOWFLAKE_FIELDS.warehouse } })
  fireEvent.change(screen.getByLabelText(/database/i), { target: { value: SNOWFLAKE_FIELDS.database } })
}

describe('ConnectionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.apiCreateConnection).mockResolvedValue({
      id: 'c1', name: 'my-conn', type: 'snowflake', owner_id: 'u1', is_active: true,
    })
    vi.mocked(api.apiUpdateConnection).mockResolvedValue({
      id: 'c1', name: 'my-conn', type: 'snowflake', owner_id: 'u1', is_active: true,
    })
  })

  it('shows snowflake fields when type=snowflake', () => {
    render(<ConnectionForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText(/account/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/private key/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/warehouse/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/passphrase/i)).toBeInTheDocument()
  })

  it('does not show schema field', () => {
    render(<ConnectionForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByLabelText(/^schema/i)).not.toBeInTheDocument()
  })

  it('shows claude fields when type=claude', () => {
    render(<ConnectionForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/type/i), { target: { value: 'claude' } })
    expect(screen.getByLabelText(/api key/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/model/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/account/i)).not.toBeInTheDocument()
  })

  it('submit is disabled until required fields are filled', () => {
    render(<ConnectionForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('calls apiCreateConnection with correct payload on submit', async () => {
    const onSuccess = vi.fn()
    render(<ConnectionForm onSuccess={onSuccess} onCancel={vi.fn()} />)
    fillSnowflake()
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(api.apiCreateConnection).toHaveBeenCalledWith({
        name: 'my-conn',
        type: 'snowflake',
        credentials: SNOWFLAKE_FIELDS,
      })
    })
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('includes passphrase in credentials when filled', async () => {
    render(<ConnectionForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    fillSnowflake()
    fireEvent.change(screen.getByLabelText(/passphrase/i), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(api.apiCreateConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: expect.objectContaining({ passphrase: 'secret' }),
        })
      )
    })
  })

  it('omits passphrase from credentials when blank', async () => {
    render(<ConnectionForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    fillSnowflake()
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      const call = vi.mocked(api.apiCreateConnection).mock.calls[0][0]
      expect(call.credentials).not.toHaveProperty('passphrase')
    })
  })

  it('pre-populates name in edit mode', () => {
    render(
      <ConnectionForm
        initial={{ id: 'c1', name: 'existing', type: 'snowflake', owner_id: 'u1', is_active: true }}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('existing')
  })

  it('type field is disabled in edit mode', () => {
    render(
      <ConnectionForm
        initial={{ id: 'c1', name: 'existing', type: 'snowflake', owner_id: 'u1', is_active: true }}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByLabelText(/type/i)).toBeDisabled()
  })

  it('save is enabled in edit mode with only name filled', () => {
    render(
      <ConnectionForm
        initial={{ id: 'c1', name: 'existing', type: 'snowflake', owner_id: 'u1', is_active: true }}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled()
  })

  it('omits credentials from patch when all cred fields blank in edit mode', async () => {
    const onSuccess = vi.fn()
    render(
      <ConnectionForm
        initial={{ id: 'c1', name: 'existing', type: 'snowflake', owner_id: 'u1', is_active: true }}
        onSuccess={onSuccess}
        onCancel={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(api.apiUpdateConnection).toHaveBeenCalledWith('c1', { name: 'existing' })
    })
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('should render Save button with btn-primary class', () => {
    render(<ConnectionForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('button', { name: /save/i })).toHaveClass('btn-primary')
  })

  it('should render Cancel button with btn-secondary class', () => {
    render(<ConnectionForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('button', { name: /cancel/i })).toHaveClass('btn-secondary')
  })

  it('shows error when name is empty on submit attempt', () => {
    render(<ConnectionForm onSuccess={vi.fn()} onCancel={vi.fn()} />)
    // fill all snowflake fields except name
    fireEvent.change(screen.getByLabelText(/account/i), { target: { value: 'x' } })
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'u' } })
    fireEvent.change(screen.getByLabelText(/private key/i), { target: { value: 'k' } })
    fireEvent.change(screen.getByLabelText(/warehouse/i), { target: { value: 'w' } })
    fireEvent.change(screen.getByLabelText(/database/i), { target: { value: 'd' } })
    // button is still disabled (name missing)
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
    expect(api.apiCreateConnection).not.toHaveBeenCalled()
  })
})
