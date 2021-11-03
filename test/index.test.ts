import { buildWorkers, createWorker } from './utils'

beforeAll(() => {
  buildWorkers()
})

describe('helix-flare', () => {
  it('should resolve a simple query', async () => {
    const worker = createWorker('./index.worker.ts')
    const query = /* GraphQL */ `
      query {
        user
      }
    `

    const res = await worker.dispatchFetch('file:', {
      method: 'POST',
      body: JSON.stringify({ query }),
    })

    expect(await res.json<unknown>()).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "user": "John Doe",
        },
      }
    `)
  })

  it('should render GraphiQL', async () => {
    const worker = createWorker('./index.worker.ts')
    const res = await worker.dispatchFetch('file:', {
      method: 'GET',
      headers: { Accept: 'text/html' },
    })

    expect(res.headers.get('content-type')).toBe('text/html')
  })

  it('should resolve via GET', async () => {
    const worker = createWorker('./index.worker.ts')
    const queryParams = new URLSearchParams({
      query: 'query { user }',
    }).toString()

    const res = await worker.dispatchFetch(`file:?${queryParams}`, {
      method: 'GET',
    })

    expect(await res.json<unknown>()).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "user": "John Doe",
        },
      }
    `)
  })
})
