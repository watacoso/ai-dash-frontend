import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import {
  apiListConnections,
  apiCreateConnection,
  apiUpdateConnection,
  apiDeleteConnection,
  apiTestConnection,
} from './connections'

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const mockConn = { id: 'c1', name: 'prod-sf', type: 'snowflake' as const, owner_id: 'u1', is_active: true }

describe('connections API', () => {
  it('apiListConnections fetches GET /api/connections', async () => {
    server.use(http.get('/api/connections', () => HttpResponse.json([mockConn])))
    const result = await apiListConnections()
    expect(result).toEqual([mockConn])
  })

  it('apiCreateConnection posts to POST /api/connections', async () => {
    server.use(http.post('/api/connections', () => HttpResponse.json(mockConn, { status: 201 })))
    const result = await apiCreateConnection({
      name: 'prod-sf', type: 'snowflake',
      credentials: { account: 'x', username: 'u', private_key: 'k', warehouse: 'w', database: 'd', schema: 's' },
    })
    expect(result).toEqual(mockConn)
  })

  it('apiUpdateConnection patches PATCH /api/connections/{id}', async () => {
    const updated = { ...mockConn, name: 'renamed' }
    server.use(http.patch('/api/connections/c1', () => HttpResponse.json(updated)))
    const result = await apiUpdateConnection('c1', { name: 'renamed' })
    expect(result.name).toBe('renamed')
  })

  it('apiDeleteConnection calls DELETE /api/connections/{id}', async () => {
    server.use(http.delete('/api/connections/c1', () => new HttpResponse(null, { status: 204 })))
    await expect(apiDeleteConnection('c1')).resolves.toBeUndefined()
  })

  it('apiTestConnection posts to POST /api/connections/{id}/test', async () => {
    server.use(
      http.post('/api/connections/c1/test', () => HttpResponse.json({ ok: true, latency_ms: 42 }))
    )
    const result = await apiTestConnection('c1')
    expect(result).toEqual({ ok: true, latency_ms: 42 })
  })
})
