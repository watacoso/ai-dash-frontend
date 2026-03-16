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

  it('should render chat panel in right column', async () => {
    renderDialog()
    await waitFor(() => screen.getByRole('dialog'))
    expect(screen.getByPlaceholderText(/ask the ai/i)).toBeInTheDocument()
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

  // --- Run panel tests ---

  const runResponse = {
    columns: ['id', 'name'],
    rows: [['1', 'Alice']],
    row_count: 1,
    duration_ms: 42,
    executed_at: '2026-03-16T10:00:00Z',
  }

  const withRunReady = {
    initialValues: {
      name: '',
      description: '',
      sql: 'SELECT 1',
      snowflake_connection_id: 'sf-1',
      claude_connection_id: null as string | null,
      models_used: [] as string[],
    },
  }

  it('should render Run button', async () => {
    renderDialog(withRunReady)
    await waitFor(() => screen.getByRole('dialog'))
    expect(screen.getByRole('button', { name: /^run$/i })).toBeInTheDocument()
  })

  it('should disable Run when sql is empty', async () => {
    renderDialog({ initialValues: { ...withRunReady.initialValues, sql: '' } })
    await waitFor(() => screen.getByRole('dialog'))
    expect(screen.getByRole('button', { name: /^run$/i })).toBeDisabled()
  })

  it('should disable Run when snowflake_connection_id not selected', async () => {
    renderDialog({ initialValues: { ...withRunReady.initialValues, snowflake_connection_id: '' } })
    await waitFor(() => screen.getByRole('dialog'))
    expect(screen.getByRole('button', { name: /^run$/i })).toBeDisabled()
  })

  it('should show spinner and disable Run while request in-flight', async () => {
    let resolve!: (v: unknown) => void
    server.use(
      http.post('/api/datasets/run', () => new Promise(r => { resolve = r }))
    )
    renderDialog(withRunReady)
    await waitFor(() => screen.getByRole('dialog'))
    fireEvent.click(screen.getByRole('button', { name: /^run$/i }))
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /^run$/i })).toBeDisabled()
    resolve(HttpResponse.json(runResponse))
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
  })

  it('should show Cancel button only while request in-flight', async () => {
    let resolve!: (v: unknown) => void
    server.use(
      http.post('/api/datasets/run', () => new Promise(r => { resolve = r }))
    )
    renderDialog(withRunReady)
    await waitFor(() => screen.getByRole('dialog'))
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^run$/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    )
    resolve(HttpResponse.json(runResponse))
    await waitFor(() => expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument())
  })

  it('should abort request and hide Cancel when Cancel clicked', async () => {
    server.use(
      http.post('/api/datasets/run', () => new Promise(() => {}))
    )
    renderDialog(withRunReady)
    await waitFor(() => screen.getByRole('dialog'))
    fireEvent.click(screen.getByRole('button', { name: /^run$/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    )
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    )
  })

  it('should render results table with column headers and rows on success', async () => {
    server.use(
      http.post('/api/datasets/run', () => HttpResponse.json(runResponse))
    )
    renderDialog(withRunReady)
    await waitFor(() => screen.getByRole('dialog'))
    fireEvent.click(screen.getByRole('button', { name: /^run$/i }))
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())
    expect(screen.getByRole('columnheader', { name: 'id' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'name' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Alice' })).toBeInTheDocument()
  })

  it('should show metadata bar with row count, duration and executed_at on success', async () => {
    server.use(
      http.post('/api/datasets/run', () => HttpResponse.json(runResponse))
    )
    renderDialog(withRunReady)
    await waitFor(() => screen.getByRole('dialog'))
    fireEvent.click(screen.getByRole('button', { name: /^run$/i }))
    await waitFor(() => expect(screen.getByTestId('run-metadata')).toBeInTheDocument())
    const meta = screen.getByTestId('run-metadata')
    expect(meta).toHaveTextContent('1')
    expect(meta).toHaveTextContent('2026-03-16')
  })

  it('should show inline error and clear table on Snowflake error (422)', async () => {
    server.use(
      http.post('/api/datasets/run', () =>
        HttpResponse.json({ error: 'bad sql' }, { status: 422 })
      )
    )
    renderDialog(withRunReady)
    await waitFor(() => screen.getByRole('dialog'))
    fireEvent.click(screen.getByRole('button', { name: /^run$/i }))
    await waitFor(() => expect(screen.getByTestId('run-error')).toBeInTheDocument())
    expect(screen.getByTestId('run-error')).toHaveTextContent('bad sql')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('should use POST /datasets/run when no dataset id', async () => {
    let adhocCalled = false
    server.use(
      http.post('/api/datasets/run', () => {
        adhocCalled = true
        return HttpResponse.json(runResponse)
      })
    )
    renderDialog(withRunReady)
    await waitFor(() => screen.getByRole('dialog'))
    fireEvent.click(screen.getByRole('button', { name: /^run$/i }))
    await waitFor(() => expect(adhocCalled).toBe(true))
  })

  it('should use POST /datasets/{id}/run when dataset has been saved', async () => {
    let savedCalled = false
    server.use(
      http.post('/api/datasets/ds-1/run', () => {
        savedCalled = true
        return HttpResponse.json(runResponse)
      })
    )
    renderDialog({
      initialValues: { id: 'ds-1', name: '', description: '', sql: 'SELECT 1', snowflake_connection_id: 'sf-1', claude_connection_id: null, models_used: [] },
    })
    await waitFor(() => screen.getByRole('dialog'))
    fireEvent.click(screen.getByRole('button', { name: /^run$/i }))
    await waitFor(() => expect(savedCalled).toBe(true))
  })

  it('should clear previous results when a new run starts', async () => {
    let callCount = 0
    let resolveFirst!: (v: unknown) => void
    let resolveSecond!: (v: unknown) => void
    server.use(
      http.post('/api/datasets/run', () => {
        callCount++
        if (callCount === 1) return new Promise(r => { resolveFirst = r })
        return new Promise(r => { resolveSecond = r })
      })
    )
    renderDialog(withRunReady)
    await waitFor(() => screen.getByRole('dialog'))

    // First run — succeeds
    fireEvent.click(screen.getByRole('button', { name: /^run$/i }))
    await waitFor(() => expect(resolveFirst).toBeDefined())
    resolveFirst(HttpResponse.json(runResponse))
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())

    // Second run — results cleared immediately
    fireEvent.click(screen.getByRole('button', { name: /^run$/i }))
    await waitFor(() => expect(screen.queryByRole('table')).not.toBeInTheDocument())
    resolveSecond(HttpResponse.json(runResponse))
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())
  })
})

// ── TKT-0032: Chat panel ───────────────────────────────────────────────────────

const withChat = {
  initialValues: {
    name: '',
    description: '',
    sql: 'SELECT 1',
    snowflake_connection_id: 'sf-1',
    claude_connection_id: 'cl-1',
    models_used: [] as string[],
  },
}

const withChatSaved = {
  initialValues: {
    id: 'ds-1',
    name: 'My DS',
    description: '',
    sql: 'SELECT 1',
    snowflake_connection_id: 'sf-1',
    claude_connection_id: 'cl-1',
    models_used: [] as string[],
  },
}

describe('DatasetDialog — chat panel', () => {
  beforeEach(() => {
    server.use(http.get('/api/connections', () => HttpResponse.json([sfConn, clConn])))
  })

  it('should render chat input and send button in right column', async () => {
    renderDialog(withChat)
    await waitFor(() => screen.getByRole('dialog'))
    expect(screen.getByPlaceholderText(/ask the ai/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('should disable send button when chat input is empty', async () => {
    renderDialog(withChat)
    await waitFor(() => screen.getByRole('dialog'))
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
  })

  it('should show user message in chat after send', async () => {
    server.use(http.post('/api/datasets/chat', () => HttpResponse.json({ role: 'assistant', content: 'ok' })))
    renderDialog(withChat)
    await waitFor(() => screen.getByRole('dialog'))
    fireEvent.change(screen.getByPlaceholderText(/ask the ai/i), { target: { value: 'describe this' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(screen.getByText('describe this')).toBeInTheDocument()
  })

  it('should show spinner while chat request is in-flight', async () => {
    let resolve!: (v: unknown) => void
    server.use(http.post('/api/datasets/chat', () => new Promise(r => { resolve = r })))
    renderDialog(withChat)
    await waitFor(() => screen.getByRole('dialog'))
    fireEvent.change(screen.getByPlaceholderText(/ask the ai/i), { target: { value: 'hi' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(resolve).toBeDefined())
    expect(screen.getByTestId('chat-spinner')).toBeInTheDocument()
    resolve(HttpResponse.json({ role: 'assistant', content: 'done' }))
  })

  it('should show assistant response in chat', async () => {
    server.use(http.post('/api/datasets/chat', () => HttpResponse.json({ role: 'assistant', content: 'Here is your answer.' })))
    renderDialog(withChat)
    await waitFor(() => screen.getByRole('dialog'))
    fireEvent.change(screen.getByPlaceholderText(/ask the ai/i), { target: { value: 'hi' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(screen.getByText('Here is your answer.')).toBeInTheDocument())
  })

  it('should update sql textarea when response contains sql_update', async () => {
    server.use(http.post('/api/datasets/chat', () => HttpResponse.json({ role: 'assistant', content: 'Updated.', sql_update: 'SELECT 2' })))
    renderDialog(withChat)
    await waitFor(() => screen.getByRole('dialog'))
    fireEvent.change(screen.getByPlaceholderText(/ask the ai/i), { target: { value: 'fix sql' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(screen.getByPlaceholderText(/sql/i)).toHaveValue('SELECT 2'))
  })

  it('should update name field when response contains name_update', async () => {
    server.use(http.post('/api/datasets/chat', () => HttpResponse.json({ role: 'assistant', content: 'Updated.', name_update: 'New Name' })))
    renderDialog(withChat)
    await waitFor(() => screen.getByRole('dialog'))
    fireEvent.change(screen.getByPlaceholderText(/ask the ai/i), { target: { value: 'name it' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(screen.getByPlaceholderText(/name/i)).toHaveValue('New Name'))
  })

  it('should update description when response contains description_update', async () => {
    server.use(http.post('/api/datasets/chat', () => HttpResponse.json({ role: 'assistant', content: 'Updated.', description_update: 'New desc' })))
    renderDialog(withChat)
    await waitFor(() => screen.getByRole('dialog'))
    fireEvent.change(screen.getByPlaceholderText(/ask the ai/i), { target: { value: 'describe' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(screen.getByPlaceholderText(/description/i)).toHaveValue('New desc'))
  })

  it('should call POST /datasets/chat when dialog has no id', async () => {
    let hit = ''
    server.use(http.post('/api/datasets/:path', ({ params }) => {
      hit = params.path as string
      return HttpResponse.json({ role: 'assistant', content: 'ok' })
    }))
    renderDialog(withChat)
    await waitFor(() => screen.getByRole('dialog'))
    fireEvent.change(screen.getByPlaceholderText(/ask the ai/i), { target: { value: 'hi' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(hit).toBe('chat'))
  })

  it('should call POST /datasets/{id}/chat when dataset is saved', async () => {
    let hit = ''
    server.use(http.post('/api/datasets/:id/chat', ({ params }) => {
      hit = params.id as string
      return HttpResponse.json({ role: 'assistant', content: 'ok' })
    }))
    renderDialog(withChatSaved)
    await waitFor(() => screen.getByRole('dialog'))
    fireEvent.change(screen.getByPlaceholderText(/ask the ai/i), { target: { value: 'hi' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(hit).toBe('ds-1'))
  })

  it('should pre-fill chat history from initialValues.messages', async () => {
    renderDialog({
      initialValues: {
        ...withChat.initialValues,
        messages: [
          { role: 'user', content: 'hello from explore' },
          { role: 'assistant', content: 'I can help with that.' },
        ],
      },
    })
    await waitFor(() => screen.getByRole('dialog'))
    expect(screen.getByText('hello from explore')).toBeInTheDocument()
    expect(screen.getByText('I can help with that.')).toBeInTheDocument()
  })
})
