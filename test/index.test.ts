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

    expect(((await res.json()) as any).data).toMatchInlineSnapshot(`
      Object {
        "user": "John Doe",
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
})
