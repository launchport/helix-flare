import { createMiniflare } from './utils'

describe('helix-flare', () => {
  test('should resolve a simple query', async () => {
    const mf = createMiniflare('./index.worker.ts')
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
})
