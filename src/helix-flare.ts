import { applyMiddleware, type IMiddleware } from 'graphql-middleware'
import {
  shouldRenderGraphiQL as helixShouldRenderGraphiQL,
  renderGraphiQL as helixRenderGraphiQL,
  type ProcessRequestOptions,
} from 'graphql-helix'
import type { GraphQLSchema } from 'graphql'

import core, { type SharedOptions } from './core'
import { createHelixRequest } from './utils/createHelixRequest'

type Options<TContext> = SharedOptions & {
  middlewares?: IMiddleware[]
  contextFactory?: ProcessRequestOptions<TContext, {}>['contextFactory']
}

export const shouldRenderGraphiQL = async (request: Request) => {
  try {
    return helixShouldRenderGraphiQL(await createHelixRequest(request))
  } catch {
    return false
  }
}

export const getGraphiQLResponse = () => {
  return new Response(helixRenderGraphiQL(), {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  })
}

const helixFlare = async <TContext>(
  request: Request,
  schema: GraphQLSchema,
  { middlewares = [], access, contextFactory }: Options<TContext> = {},
) => {
  return core({
    request,
    schema: applyMiddleware(schema, ...middlewares),
    contextFactory,
    access,
  })
}

export default helixFlare
