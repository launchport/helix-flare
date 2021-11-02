import { buildWorkers, createWorker } from './utils'
import { createClient } from 'graphql-sse'
import { jest } from '@jest/globals'

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
      sseClient.subscribe(
        {
          query: /* GraphQL */ `
            subscription {
              upvotes(articleId: "1")
            }
          `,
        },
        {
          next: ({ data }) => {
            if (data?.upvotes === 1) {
              resolve()
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
})
