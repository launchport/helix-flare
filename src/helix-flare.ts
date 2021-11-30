import type { ProcessRequestOptions } from 'graphql-helix'
import type { IMiddleware } from 'graphql-middleware'
import { applyMiddleware } from 'graphql-middleware'
import type { GraphQLSchema } from 'graphql'

import type { CreateAccessHeadersOptions } from './utils/createAccessHeaders'
import core from './core'

type Options<TContext> = {
  access?: CreateAccessHeadersOptions
  middlewares?: IMiddleware[]
  contextFactory?: ProcessRequestOptions<TContext, {}>['contextFactory']
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
