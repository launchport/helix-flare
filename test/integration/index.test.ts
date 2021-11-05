import { buildWorkers, createWorker } from './utils'

beforeAll(() => {
  buildWorkers()
})

describe('helix-flare', () => {
  it('should resolve a simple query', async () => {
    const worker = createWorker('./index.worker.ts')

    const res = await worker.dispatchFetch('file:', {
      method: 'POST',
      body: JSON.stringify({ query: 'query { user }' }),
    })

    await expect(res.json<unknown>()).resolves.toMatchInlineSnapshot(`
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
    const queryParams = new URLSearchParams({ query: 'query { user }' })

    const res = await worker.dispatchFetch(`file:?${queryParams.toString()}`, {
      method: 'GET',
    })

    await expect(res.json<unknown>()).resolves.toMatchInlineSnapshot(`
                  Object {
                    "data": Object {
                      "user": "John Doe",
                    },
                  }
              `)
  })

  it('should retain context in worker', async () => {
    const worker = createWorker('./index.worker.ts')

    const res = await worker.dispatchFetch('file:', {
      method: 'POST',
      body: JSON.stringify({ query: 'query { context }' }),
    })

    await expect(res.json<any>()).resolves.toMatchInlineSnapshot(`
                  Object {
                    "data": Object {
                      "context": "papaya",
                    },
                  }
              `)
  })

  it('should retain context in durable object', async () => {
    // @todo
  })

  it('should resolve errors from executor', async () => {
    const worker = createWorker('./executor-error.worker.ts')

    const res = await worker.dispatchFetch('file:///', {
      method: 'POST',
      body: JSON.stringify({ query: '{ error(byArg: true) }' }),
    })
    expect((await res.json<any>()).errors[0].message).toMatchInlineSnapshot(
      `"Error by arg"`,
    )

    const res2 = await worker.dispatchFetch('file:///', {
      method: 'POST',
      body: JSON.stringify({ query: '{ error(byContext: true) }' }),
    })
    expect((await res2.json<any>()).errors[0].message).toMatchInlineSnapshot(
      `"Error by context"`,
    )
  })
})
