import { observableToAsyncIterable } from '@graphql-tools/utils'
import { print } from 'graphql'
import type { AsyncExecutor } from '@graphql-tools/utils'

import { fetchEventSource } from './fetchEventSource'
import getArguments from './getArguments'

export function createExecutor<
  TContext extends Record<string, any>,
  TArgs extends Record<string, any> = Record<string, any>,
>(
  request: Request,
  selectDurableObject: (
    args: TArgs,
    context: TContext | undefined,
  ) => Promise<DurableObjectStub>,
): AsyncExecutor<TContext> {
  return async ({ variables, document, info, context }) => {
    if (!info) {
      throw new Error('No query info available.')
    }

    const query = print(document)

    const args = getArguments<TArgs>(info)
    const durableObject = await selectDurableObject(args, context)

    if (request.headers.get('accept') === 'text/event-stream') {
      return observableToAsyncIterable({
        subscribe: ({ next, complete, error }) => {
          fetchEventSource(request.url, {
            method: 'POST',
            fetch: durableObject.fetch.bind(durableObject),
            headers: Object.fromEntries(request.headers.entries()),
            body: JSON.stringify({
              query,
              variables,
            }),
            onClose() {
              complete()
            },
            onMessage(message) {
              if (message.event === 'complete') {
                complete()
              } else {
                next(JSON.parse(message.data))
              }
            },
            onError(e) {
              error(e)
            },
          })

          return {
            unsubscribe: () => undefined,
          }
        },
      })
    } else {
      return new Promise(async (resolve) => {
        const result = await durableObject.fetch(request.url, {
          method: request.method,
          headers: Object.fromEntries(request.headers.entries()),
          body: JSON.stringify({ query, variables }),
        })
        resolve(result.json())
      })
    }
  }
}
