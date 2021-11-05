import { observableToAsyncIterable } from '@graphql-tools/utils'
import { print } from 'graphql'
import type { AsyncExecutor } from '@graphql-tools/utils'

import { fetchEventSource } from './fetchEventSource'
import getArguments from './getArguments'

export function createExecutor<
  TArgs extends Record<string, any>,
  TContext extends Record<string, any> = Record<string, any>,
>(
  request: Request,
  selectDurableObject: (
    args: TArgs,
    context: TContext,
  ) => Promise<DurableObjectStub>,
): AsyncExecutor<TContext, TArgs> {
  return async ({ variables, document, info, context }) => {
    if (!info) {
      throw new Error('No query info available.')
    }

    const query = print(document)

    const args = getArguments<TArgs>(info)
    const durableObject = await selectDurableObject(
      args,
      context || ({} as TContext),
    )

    const body = JSON.stringify({ query, variables })
    const headers = Object.fromEntries(request.headers.entries())

    if (request.headers.get('accept') === 'text/event-stream') {
      return observableToAsyncIterable({
        subscribe: ({ next, complete, error }) => {
          fetchEventSource(request.url, {
            method: 'POST',
            body,
            headers,
            fetch: durableObject.fetch.bind(durableObject),

            onClose: () => complete(),
            onMessage: (message) => {
              // ping
              if (message.data === '' && message.event === '') {
                return
              }

              if (message.data) {
                next(JSON.parse(message.data))

                if (message.event === 'complete') {
                  complete()
                }
              }
            },
            onError: (e) => error(e),
          })

          return {
            unsubscribe: () => undefined,
          }
        },
      })
    } else {
      try {
        const response = await durableObject.fetch(request.url, {
          method: request.method,
          body,
          headers,
        })

        return await response.json()
      } catch (e: any) {
        // for some reason the errors may not origin from `Error` in this case
        // we receive `Unexpected error value: {}` which is not very meaningful
        // wrapping it with Error will transport its original meaning
        if (e instanceof Error) {
          throw e
        } else {
          throw new Error(e)
        }
      }
    }
  }
}
