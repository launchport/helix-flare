import { buildWorkers, createMiniflare } from './utils'

beforeAll(() => {
  buildWorkers()
})

it('should do something', async () => {
  const mf = createMiniflare('./durable-object.worker.ts', {
    durableObjects: {
      HELIX_OBJECT: 'HelixObject',
    },
  })

  const query = async (query: string) => {
    const res = await mf.dispatchFetch('file:', {
      method: 'POST',
      body: JSON.stringify({ query }),
    })

    return (await res.json()).data
  }

  let result = await query(`query { status }`)
  expect(result.status).toBe('stopped')

  await query(`mutation { start }`)

  result = await query(`query { status }`)
  expect(result.status).toBe('started')
})
