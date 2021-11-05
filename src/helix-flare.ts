import {
  getGraphQLParameters,
  processRequest,
  renderGraphiQL,
  shouldRenderGraphiQL,
} from 'graphql-helix'
import { applyMiddleware } from 'graphql-middleware'
import type { GraphQLSchema } from 'graphql'
import type { ExecutionContext } from 'graphql-helix'
import type { IMiddleware } from 'graphql-middleware'

import { access } from './access'
import { writeToStream } from './writeToStream'
import { createHelixRequest } from './createHelixRequest'

type Options<TContext> = {
  allowedOrigins?: string[]
  credentials?: boolean
  middlewares?: IMiddleware[]
  contextFactory?: (
    executionContext: ExecutionContext,
  ) => Promise<TContext> | TContext
}

const helixFlare = async <TContext>(
  request: Request,
  schema: GraphQLSchema,
  { middlewares = [], allowedOrigins, contextFactory }: Options<TContext> = {},
) => {
  const cors = access({ origins: allowedOrigins, maxAge: 7200 })
  const { isPreflight, headers } = cors(request)

  if (isPreflight) {
    return new Response('', {
      status: 200,
      headers: headers,
      // {
      //   'Access-Control-Allow-Headers':
      //     'Authorization, Content-Type, Cache-Control',
      //   'Access-Control-Allow-Origin': '*',
      //   'Access-Control-Max-Age': '7200',
      // },
    })
  }

  const helixRequest = await createHelixRequest(request)

  if (shouldRenderGraphiQL(helixRequest)) {
    return new Response(renderGraphiQL(), {
      headers: { 'Content-Type': 'text/html' },
    })
  } else {
    const { operationName, query, variables } =
      getGraphQLParameters(helixRequest)

    const result = await processRequest({
      operationName,
      query,
      variables,
      request: helixRequest,
      schema: applyMiddleware(schema, ...middlewares),
      contextFactory,
    })

    if (result.type === 'RESPONSE') {
      return new Response(JSON.stringify(result.payload), {
        status: result.status,
        headers: {
          ...Object.fromEntries(
            result.headers.map(({ name, value }) => [name, value]),
          ),
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json; charset=utf-8',
        },
      })
    } else if (result.type === 'PUSH') {
      const { readable, writable } = new TransformStream()
      const stream = writable.getWriter()

      const intervalId = setInterval(() => {
        writeToStream(stream, ':\n\n')
      }, 15000)

      ;(request.signal as any)?.addEventListener('abort', async () => {
        clearInterval(intervalId)
        await stream.close()
      })

      result
        .subscribe((data) => {
          writeToStream(stream, {
            event: 'next',
            data: JSON.stringify(data),
          })
        })
        .then(() => {
          clearInterval(intervalId)
          writeToStream(stream, { event: 'complete' })
        })

      return new Response(readable, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers':
            'Origin, X-Requested-With, Content-Type, Accept',
        },
      })
    } else if (result.type === 'MULTIPART_RESPONSE') {
      return new Response('@stream/@defer directives are not supported', {
        status: 405,
      })
    } else {
      return new Response('not supported', { status: 405 })
    }
  }
}

export default helixFlare
