import { buildWorkers, createWorker } from './utils'

beforeAll(() => {
  buildWorkers()
})

it('should do something', async () => {
  const worker = createWorker('./durable-object.worker.ts', {
    durableObjects: {
      HELIX_OBJECT: 'HelixObject',
    },
  })

  const query = async (query: string) => {
    const res = await worker.dispatchFetch('file:', {
      method: 'POST',
      body: JSON.stringify({ query }),
    })

    return (await res.json()).data
  }

  let res = await query(/* GraphQL */ `
    mutation {
      start
    }
  `)

  const doId = res.start

  res = await query(/* GraphQL */ `
    query {
      status(id: "${doId}")
    }
  `)
  expect(res.status).toBe('started')
})
