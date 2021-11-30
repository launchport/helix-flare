import {
  getGraphQLParameters,
  getMultipartResponse,
  processRequest,
  renderGraphiQL,
  shouldRenderGraphiQL,
} from 'graphql-helix'

import { createAccessHeaders } from './utils/createAccessHeaders'
import type { CreateAccessHeadersOptions } from './utils/createAccessHeaders'
import { createHelixRequest } from './utils/createHelixRequest'
import type { ProcessRequestOptions } from 'graphql-helix'
import getPushResponseSSE from './sse/getPushResponseSSE'
import getResponse from './utils/getResponse'

type Options = { request: Request; access?: CreateAccessHeadersOptions } & Pick<
  ProcessRequestOptions<any, any>,
  'parse' | 'validate' | 'contextFactory' | 'execute' | 'schema'
>

const core = async <TContext>({
  request,
  schema,
  parse,
  validate,
  execute,
  contextFactory,
  access,
}: Options) => {
  const cors = createAccessHeaders(access)
  const { isPreflight, headers } = cors(request)

  if (isPreflight) {
    return new Response(null, { status: 204, headers })
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
      schema,
      parse,
      validate,
      execute,
      contextFactory,
    })

    switch (result.type) {
      case 'RESPONSE':
        return getResponse(result, headers)
      case 'PUSH':
        // @todo cors headers
        return getPushResponseSSE(result, request)
      case 'MULTIPART_RESPONSE':
        return getMultipartResponse(result, Response, ReadableStream as any)
      default:
        return new Response('Not supported.', { status: 405 })
    }
  }
}

export default core
