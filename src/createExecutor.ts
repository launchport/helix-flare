import {
  getArgumentValues,
  observableToAsyncIterable,
} from '@graphql-tools/utils'
import { getNullableType, print } from 'graphql'
import type { Executor } from '@graphql-tools/utils'
import type { GraphQLObjectType, GraphQLResolveInfo } from 'graphql'

import { fetchEventSource } from './fetchEventSource'

const getType = (type: any): GraphQLObjectType => {
  const actualType = getNullableType(type)
  return actualType.ofType ? getType(actualType.ofType) : type
}

const getArguments = (info: GraphQLResolveInfo) => {
  const name = info.fieldName
  const fieldDef = getType(info.parentType).getFields()[name]
  const node = info.fieldNodes[0]

  return getArgumentValues(fieldDef, node, info.variableValues)
}

export function createExecutor<TContext extends Record<string, any>>(
  request: Request,
  selectDurableObject: (
    args: Record<string, any | undefined>,
    context: TContext,
  ) => Promise<DurableObjectStub>,
): Executor<TContext> {
  return async ({ variables, document, info, context }) => {
    if (!info) {
      throw new Error('No query info available.')
    }

    const query = print(document)

    const args = getArguments(info)
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
      return new Promise(async (res) => {
        const result = await durableObject.fetch(request.url, {
          method: request.method,
          headers: Object.fromEntries(request.headers.entries()),
          body: JSON.stringify({ query, variables }),
        })
        res(result.json())
      })
    }
  }
}
