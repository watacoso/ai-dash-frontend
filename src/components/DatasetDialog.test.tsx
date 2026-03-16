import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router-dom'
import { DatasetDialog } from './DatasetDialog'

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks() })
afterAll(() => server.close())

const sfConn = { id: 'sf-1', name: 'Prod Snowflake', type: 'snowflake', owner_id: 'u1', is_active: true }
const clConn = { id: 'cl-1', name: 'Claude Sonnet', type: 'claude', owner_id: 'u1', is_active: true }

function renderDialog(props: Partial<React.ComponentProps<typeof DatasetDialog>> = {}) {
  const defaults = {
    open: true,
    onClose: vi.fn(),
    onSaved: vi.fn(),
  }
  return render(
    <MemoryRouter>
      <DatasetDialog {...defaults} {...props} />
    </MemoryRouter>
  )
}

describe('DatasetDialog', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/connections', () => HttpResponse.json([sfConn, clConn]))
    )
  })

  it('should render as a modal when open', async () => {
    renderDialog()
    await waitFor(() =>
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    )
  })

  it('should close on Escape key', async () => {
    const onClose = vi.fn()
    renderDialog({ onClose })
    await waitFor(() => screen.getByRole('dialog'))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('should close when close button clicked', async () => {
    const onClose = vi.fn()
    renderDialog({ onClose })
    await waitFor(() => screen.getByRole('dialog'))
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('should render name and description fields in header', async () => {
    renderDialog()
    await waitFor(() => screen.getByRole('dialog'))
    expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/description/i)).toBeInTheDocument()
  })

  it('should not render models_used badge when empty', async () => {
    renderDialog()
    await waitFor(() => screen.getByRole('dialog'))
    expect(screen.queryByTestId('models-used-badge')).not.toBeInTheDocument()
  })

  it('should format models_used as "A, B" for two models', async () => {
    renderDialog({ initialValues: { name: '', description: '', sql: '', snowflake_connection_id: '', claude_connection_id: null, models_used: ['claude-sonnet-4-6', 'claude-opus-4-6'] } })
    await waitFor(() => screen.getByTestId('models-used-badge'))
    expect(screen.getByTestId('models-used-badge')).toHaveTextContent('claude-sonnet-4-6, claude-opus-4-6')
  })

  it('should format models_used as "A and 2 others" for three or more', async () => {
    renderDialog({ initialValues: { name: '', description: '', sql: '', snowflake_connection_id: '', claude_connection_id: null, models_used: ['A', 'B', 'C'] } })
    await waitFor(() => screen.getByTestId('models-used-badge'))
    expect(screen.getByTestId('models-used-badge')).toHaveTextContent('A and 2 others')
  })

  it('should render Snowflake and Claude connection selectors populated from GET /connections', async () => {
    renderDialog()
    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'Prod Snowflake' })).toBeInTheDocument()
    )
    expect(screen.getByRole('option', { name: 'Claude Sonnet' })).toBeInTheDocument()
  })

  it('should render SQL textarea in left column', async () => {
    renderDialog()
    await waitFor(() => screen.getByRole('dialog'))
    expect(screen.getByPlaceholderText(/sql/i)).toBeInTheDocument()
  })

  it('should render Chat placeholder in right column', async () => {
    renderDialog()
    await waitFor(() => screen.getByRole('dialog'))
    expect(screen.getByTestId('dialog-chat-placeholder')).toBeInTheDocument()
  })

  it('should disable Save when name is empty', async () => {
    renderDialog()
    await waitFor(() => screen.getByRole('dialog'))
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('should disable Save when sql is empty', async () => {
    renderDialog()
    await waitFor(() => screen.getByRole('dialog'))
    fireEvent.change(screen.getByPlaceholderText(/name/i), { target: { value: 'My DS' } })
    // sql still empty, no SF selected
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('should disable Save when snowflake_connection_id not selected', async () => {
    renderDialog()
    await waitFor(() => screen.getByRole('option', { name: 'Prod Snowflake' }))
    fireEvent.change(screen.getByPlaceholderText(/name/i), { target: { value: 'My DS' } })
    fireEvent.change(screen.getByPlaceholderText(/sql/i), { target: { value: 'SELECT 1' } })
    // SF select still on default empty option
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('should call POST /datasets on Save in create mode and invoke onSaved', async () => {
    const created = { id: 'new-1', name: 'My DS', description: '', sql: 'SELECT 1', snowflake_connection_id: 'sf-1', claude_connection_id: null, models_used: [], created_by: 'u1', created_at: '', updated_at: '' }
    server.use(
      http.post('/api/datasets', () => HttpResponse.json(created, { status: 201 }))
    )
    const onSaved = vi.fn()
    renderDialog({ onSaved })
    await waitFor(() => screen.getByRole('option', { name: 'Prod Snowflake' }))

    fireEvent.change(screen.getByPlaceholderText(/name/i), { target: { value: 'My DS' } })
    fireEvent.change(screen.getByPlaceholderText(/sql/i), { target: { value: 'SELECT 1' } })
    fireEvent.change(screen.getByDisplayValue('— select Snowflake —'), { target: { value: 'sf-1' } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(created))
  })

  it('should call PATCH /datasets/{id} on Save in edit mode', async () => {
    let patchCalled = false
    server.use(
      http.patch('/api/datasets/ds-1', async () => {
        patchCalled = true
        return HttpResponse.json({ id: 'ds-1', name: 'Updated', description: '', sql: 'SELECT 2', snowflake_connection_id: 'sf-1', claude_connection_id: null, models_used: [], created_by: 'u1', created_at: '', updated_at: '' })
      })
    )
    renderDialog({
      initialValues: { id: 'ds-1', name: 'Original', description: '', sql: 'SELECT 1', snowflake_connection_id: 'sf-1', claude_connection_id: null, models_used: [] },
    })
    await waitFor(() => screen.getByRole('option', { name: 'Prod Snowflake' }))

    fireEvent.change(screen.getByPlaceholderText(/name/i), { target: { value: 'Updated' } })
    fireEvent.change(screen.getByPlaceholderText(/sql/i), { target: { value: 'SELECT 2' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(patchCalled).toBe(true))
  })

  it('should pre-populate fields from initialValues prop', async () => {
    renderDialog({
      initialValues: { id: 'ds-1', name: 'Pre-filled', description: 'Some desc', sql: 'SELECT id FROM t', snowflake_connection_id: 'sf-1', claude_connection_id: null, models_used: [] },
    })
    await waitFor(() => screen.getByRole('dialog'))
    expect(screen.getByPlaceholderText(/name/i)).toHaveValue('Pre-filled')
    expect(screen.getByPlaceholderText(/description/i)).toHaveValue('Some desc')
    expect(screen.getByPlaceholderText(/sql/i)).toHaveValue('SELECT id FROM t')
  })
})
