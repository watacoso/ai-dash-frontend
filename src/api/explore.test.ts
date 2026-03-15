import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { apiExploreChat } from './explore'

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const payload = {
  snowflake_connection_id: 'sf-1',
  claude_connection_id: 'cl-1',
  messages: [{ role: 'user', content: 'what databases are available?' }],
}

describe('apiExploreChat', () => {
  it('POSTs to /api/explore/chat and returns the response', async () => {
    let capturedBody: unknown
    server.use(
      http.post('/api/explore/chat', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ role: 'assistant', content: 'You have DB1, DB2.' })
      })
    )
    const result = await apiExploreChat(payload)
    expect(result).toEqual({ role: 'assistant', content: 'You have DB1, DB2.' })
    expect(capturedBody).toEqual(payload)
  })

  it('throws on non-ok response', async () => {
    server.use(http.post('/api/explore/chat', () => HttpResponse.json({ detail: 'err' }, { status: 500 })))
    await expect(apiExploreChat(payload)).rejects.toThrow('500')
  })
})
