import {
  getGraphQLParameters,
  getMultipartResponse,
  getRegularResponse,
  processRequest,
  renderGraphiQL,
  shouldRenderGraphiQL,
} from 'graphql-helix'
import { applyMiddleware } from 'graphql-middleware'
import type { GraphQLSchema } from 'graphql'
import type { IMiddleware } from 'graphql-middleware'

import { access } from './access'
import { createHelixRequest } from './createHelixRequest'
import { ProcessRequestOptions } from 'graphql-helix/dist/types'
import getPushResponseSSE from './getPushResponseSSE'

type Options<TContext> = {
  allowedOrigins?: string[]
  credentials?: boolean
  middlewares?: IMiddleware[]
  contextFactory?: ProcessRequestOptions<TContext, {}>['contextFactory']
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
      headers,
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

    switch (result.type) {
      case 'RESPONSE':
        return getRegularResponse(result, Response)
      case 'PUSH':
        return getPushResponseSSE(result, request)
      case 'MULTIPART_RESPONSE':
        return getMultipartResponse(result, Response, ReadableStream as any)
      default:
        return new Response('Not supported.', { status: 405 })
    }
  }
}

export default helixFlare
