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

  it('should resolve errors from executor', async () => {
    const worker = createWorker('./executor-error.worker.ts')

    const res = await worker.dispatchFetch('file:///', {
      method: 'POST',
      body: JSON.stringify({ query: '{ hello }' }),
    })
    expect((await res.json<any>()).errors).toMatchInlineSnapshot(`
      Array [
        Object {
          "locations": Array [
            Object {
              "column": 3,
              "line": 1,
            },
          ],
          "message": "Should propagate",
          "path": Array [
            "hello",
          ],
        },
      ]
    `)
  })
})
