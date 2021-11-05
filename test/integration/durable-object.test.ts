import { buildWorkers, createWorker } from './utils'

beforeAll(() => {
  buildWorkers()
})

describe('Durable object worker', () => {
  it('should mutate and resolve', async () => {
    const worker = createWorker('./durable-object.worker.ts', {
      durableObjects: {
        HELIX_OBJECT: 'HelixObject',
      },
    })

    const query = async <TResult = any>(query: string, variables?: object) => {
      const res = await worker.dispatchFetch('file:', {
        method: 'POST',
        body: JSON.stringify({ query, variables }),
      })

      const result = await res.json<any>()

      return result.data
    }

    let res = await query('mutation { start }')

    const doId = res.start

    res = await query(
      /* GraphQL */ `
        query ($doId: String!) {
          status(id: $doId)
        }
      `,
      { doId },
    )
    expect(res.status).toBe('started')
  })
})
