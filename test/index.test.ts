import { buildWorkers, cleanWorkers, createMiniflare } from './utils'

beforeAll(() => {
  buildWorkers()
})

afterAll(() => {
  cleanWorkers()
})

describe('helix-flare', () => {
  it('should resolve a simple query', async () => {
    const mf = await createMiniflare('./index.worker.ts')
    const query = /* GraphQL */ `
      query {
        user
      }
    `

    const res = await mf.dispatchFetch('file:', {
      method: 'POST',
      body: JSON.stringify({ query }),
    })

    expect((await res.json()).data).toMatchInlineSnapshot(`
      Object {
        "user": "John Doe",
      }
    `)
  })

  it('should render GraphiQL', async () => {
    const mf = await createMiniflare('./index.worker.ts')
    const res = await mf.dispatchFetch('file:', {
      method: 'GET',
      headers: { Accept: 'text/html' },
    })

    expect(res.headers.get('content-type')).toBe('text/html')
  })
})
