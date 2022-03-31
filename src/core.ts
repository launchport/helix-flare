import {
  getGraphQLParameters,
  getMultipartResponse,
  processRequest,
  type ProcessRequestOptions,
} from 'graphql-helix'

import {
  createAccessHeaders,
  type CreateAccessHeadersOptions,
} from './utils/createAccessHeaders'
import { createHelixRequest } from './utils/createHelixRequest'
import getPushResponseSSE from './sse/getPushResponseSSE'
import getResponse from './utils/getResponse'

export type SharedOptions = {
  access?: CreateAccessHeadersOptions
}

type Options = SharedOptions & {
  request: Request
} & Pick<
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
  try {
    const helixRequest = await createHelixRequest(request)

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
  } catch {
    return new Response('Bad Request', { status: 400 })
  }
}

export default core
