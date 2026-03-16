import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router-dom'
import { ChartDialog } from './ChartDialog'

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks() })
afterAll(() => server.close())

const sampleDatasets = [
  { id: 'ds-1', name: 'Orders dataset', description: '', sql: '', snowflake_connection_id: 'sf-1', claude_connection_id: null, models_used: [], created_by: 'u1', created_at: '2026-03-16T10:00:00Z', updated_at: '2026-03-16T10:00:00Z' },
]

const clConn = { id: 'cl-1', name: 'Claude Sonnet', type: 'claude', owner_id: 'u1', is_active: true }

function renderDialog(props: Partial<React.ComponentProps<typeof ChartDialog>> = {}) {
  const defaults = { open: true, onClose: vi.fn(), onSaved: vi.fn() }
  return render(
    <MemoryRouter>
      <ChartDialog {...defaults} {...props} />
    </MemoryRouter>
  )
}

describe('ChartDialog', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/datasets', () => HttpResponse.json(sampleDatasets)),
      http.get('/api/connections', () => HttpResponse.json([clConn])),
    )
  })

  it('should render dialog with name, datasource selector, d3 textarea, Save button', async () => {
    renderDialog()
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/d3 code/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('should not render when open is false', () => {
    renderDialog({ open: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should pre-fill fields when initialValues provided', async () => {
    renderDialog({
      initialValues: { id: 'ch-1', name: 'My chart', datasource_id: 'ds-1', d3_code: "d3.select('svg');", versions: [] },
    })
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    expect(screen.getByPlaceholderText(/name/i)).toHaveValue('My chart')
    expect(screen.getByPlaceholderText(/d3 code/i)).toHaveValue("d3.select('svg');")
  })

  it('should disable Save when name is empty', async () => {
    renderDialog()
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('should call POST /api/charts on save for new chart', async () => {
    let posted = false
    server.use(
      http.post('/api/charts', async () => {
        posted = true
        return HttpResponse.json({ id: 'ch-new', name: 'New chart', datasource_id: 'ds-1', versions: [], created_by: 'u1', created_at: '2026-03-16T10:00:00Z', updated_at: '2026-03-16T10:00:00Z' })
      })
    )
    const onSaved = vi.fn()
    renderDialog({ onSaved })
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText(/name/i), { target: { value: 'New chart' } })
    // select datasource
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'ds-1' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(posted).toBe(true))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
  })

  it('should call PATCH /api/charts/{id} on save for existing chart', async () => {
    let patched = false
    server.use(
      http.patch('/api/charts/ch-1', async () => {
        patched = true
        return HttpResponse.json({ id: 'ch-1', name: 'My chart', datasource_id: 'ds-1', versions: [], created_by: 'u1', created_at: '2026-03-16T10:00:00Z', updated_at: '2026-03-16T10:00:00Z' })
      })
    )
    renderDialog({
      initialValues: { id: 'ch-1', name: 'My chart', datasource_id: 'ds-1', d3_code: '', versions: [] },
    })
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(patched).toBe(true))
  })

  it('should send chat message to /api/charts/chat for new chart', async () => {
    let chatHit = false
    server.use(
      http.post('/api/charts/chat', async () => {
        chatHit = true
        return HttpResponse.json({ role: 'assistant', content: 'Here is your chart!', d3_code_update: null })
      })
    )
    renderDialog()
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText(/ask the ai/i), { target: { value: 'make a bar chart' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(chatHit).toBe(true))
  })

  it('should send chat to /api/charts/{id}/chat for saved chart', async () => {
    let chatHit = false
    server.use(
      http.post('/api/charts/ch-1/chat', async () => {
        chatHit = true
        return HttpResponse.json({ role: 'assistant', content: 'Updated!', d3_code_update: null })
      })
    )
    renderDialog({
      initialValues: { id: 'ch-1', name: 'My chart', datasource_id: 'ds-1', d3_code: '', versions: [] },
    })
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText(/ask the ai/i), { target: { value: 'improve it' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(chatHit).toBe(true))
  })

  it('should update d3_code textarea when d3_code_update returned', async () => {
    server.use(
      http.post('/api/charts/chat', async () =>
        HttpResponse.json({ role: 'assistant', content: 'Done!', d3_code_update: "d3.select('svg').append('rect');" })
      )
    )
    renderDialog()
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText(/ask the ai/i), { target: { value: 'make a chart' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/d3 code/i)).toHaveValue("d3.select('svg').append('rect');")
    )
  })

  it('should show Thinking spinner while chat loading', async () => {
    let resolve!: (v: unknown) => void
    server.use(
      http.post('/api/charts/chat', () => new Promise(r => { resolve = r }))
    )
    renderDialog()
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText(/ask the ai/i), { target: { value: 'hi' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(screen.getByTestId('chat-spinner')).toBeInTheDocument())
    resolve(HttpResponse.json({ role: 'assistant', content: 'ok', d3_code_update: null }))
  })

  it('should render D3Preview inside dialog', async () => {
    // Arrange — open with d3_code set
    renderDialog({
      initialValues: { id: 'ch-1', name: 'My chart', datasource_id: 'ds-1', d3_code: "d3.select('svg');", versions: [] },
    })
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    // Assert — iframe (live preview) present
    expect(document.querySelector('iframe')).toBeInTheDocument()
  })

  it('should render version history panel in dialog', async () => {
    // Arrange
    renderDialog({
      initialValues: {
        id: 'ch-1', name: 'My chart', datasource_id: 'ds-1', d3_code: '', versions: [
          { version: 0, d3_code: "d3.select('svg');", accepted: false, created_at: '2026-03-16T10:00:00Z' },
        ],
      },
    })
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    // Assert
    expect(screen.getByText(/v0/i)).toBeInTheDocument()
  })

  it('should call PATCH /api/charts/{id} with accepted_version when Accept clicked', async () => {
    let patchBody: unknown = null
    server.use(
      http.patch('/api/charts/ch-1', async ({ request }) => {
        patchBody = await request.json()
        return HttpResponse.json({ id: 'ch-1', name: 'My chart', datasource_id: 'ds-1', versions: [{ version: 0, d3_code: "d3.select('svg');", accepted: true, created_at: '2026-03-16T10:00:00Z' }], created_by: 'u1', created_at: '2026-03-16T10:00:00Z', updated_at: '2026-03-16T10:00:00Z' })
      })
    )
    renderDialog({
      initialValues: {
        id: 'ch-1', name: 'My chart', datasource_id: 'ds-1', d3_code: '', versions: [
          { version: 0, d3_code: "d3.select('svg');", accepted: false, created_at: '2026-03-16T10:00:00Z' },
        ],
      },
    })
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /accept/i }))
    await waitFor(() => expect(patchBody).toEqual({ accepted_version: 0 }))
  })
})
