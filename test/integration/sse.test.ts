import { buildWorkers, createWorker } from './utils'
import { createClient } from 'graphql-sse'

beforeAll(() => {
  buildWorkers()
})

describe('SSE', () => {
  it('should subscribe and update', async () => {
    const worker = createWorker('./sse.worker.ts', {
      durableObjects: {
        NEWS_ARTICLE_OBJECT: 'NewsArticleObject',
      },
    })

    const sseClient = createClient({
      url: 'file://test/graphql',
      fetchFn: worker.dispatchFetch.bind(worker),
    })

    const subscriptionPromise = new Promise<void>(async (resolve, reject) => {
      const unsub = sseClient.subscribe(
        {
          query: /* GraphQL */ `
            subscription {
              upvotes(articleId: "1")
            }
          `,
        },
        {
          next: (data) => {
            if (data.data?.upvotes === 1) {
              resolve()
              unsub()
            }
          },
          error: (error) => reject(error),
          complete: () => {
            console.log('complete?')
          },
        },
      )

      setTimeout(() => {
        worker.dispatchFetch('file://test/graphql', {
          method: 'POST',
          body: JSON.stringify({
            query: /* GraphQL */ `
              mutation {
                upvote(articleId: "1")
              }
            `,
          }),
        })
      }, 100)
    })

    await expect(subscriptionPromise).resolves.toBeUndefined()
  })

  it('should handle multiple subscriptions correctly', async () => {
    const worker = createWorker('./sse.worker.ts', {
      durableObjects: {
        NEWS_ARTICLE_OBJECT: 'NewsArticleObject',
      },
    })

    const fetchFn = worker.dispatchFetch.bind(worker)

    const expectedUpvotes = 5

    const clients = Array.from({ length: 2 }, () => {
      return new Promise<number>((resolve, reject) => {
        const sseClient = createClient({ url: 'file:///graphql', fetchFn })
        let i = 0
        const unsub = sseClient.subscribe<Record<string, 'upvotes'>>(
          {
            query: /* GraphQL */ `
              subscription {
                upvotes(articleId: "1")
              }
            `,
          },
          {
            next: () => {
              if (++i === expectedUpvotes) {
                resolve(i)
                unsub()
              }
            },
            error: reject,
            complete: () => {},
          },
        )
      })
    })

    Array.from({ length: expectedUpvotes - 1 }).forEach(() => {
      worker.dispatchFetch('file:///graphql', {
        method: 'POST',
        body: JSON.stringify({ query: `mutation { upvote(articleId: "1") }` }),
      })
    })

    await expect(Promise.all(clients)).resolves.toEqual([
      expectedUpvotes,
      expectedUpvotes,
    ])
  })
})
