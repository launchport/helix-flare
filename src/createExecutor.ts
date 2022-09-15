import {
  observableToAsyncIterable,
  type AsyncExecutor,
} from '@graphql-tools/utils'
import { print } from 'graphql'

import getArguments from './utils/getArguments'

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
      // redirect stream from DO directly to client without parsing to keep stream connection client <-> DO
      // @ts-ignore
      context.___stream_response = await durableObject.fetch(request.url, {
        method: 'POST',
        body,
        headers,
      });
      return {} as any;
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
