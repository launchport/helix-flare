import { GraphQLSchema } from 'graphql'
import {
  ExecutionContext,
  getGraphQLParameters,
  processRequest,
  renderGraphiQL,
  shouldRenderGraphiQL,
} from 'graphql-helix'
import { applyMiddleware, IMiddleware } from 'graphql-middleware'

export class HttpError extends Error {
  status: number
  headers?: { name: string; value: string }[]
  graphqlErrors?: readonly Error[]

  constructor(
    status: number,
    message: string,
    details: {
      headers?: { name: string; value: string }[]
      graphqlErrors?: readonly Error[]
    } = {},
  ) {
    super(message)
    this.status = status
    this.headers = details.headers
    this.graphqlErrors = details.graphqlErrors
  }
}

type Options<TContext> = {
  allowedOrigins?: string[]
  credentials?: boolean
  middlewares?: IMiddleware[]
  contextFactory?: (
    executionContext: ExecutionContext,
  ) => Promise<TContext> | TContext
}

const access = ({
  origins = ['*'],
  credentials = true,
  methods = ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
  headers = [],
  maxAge,
}: {
  origins?: string[]
  credentials?: boolean
  methods?: string[]
  maxAge?: number
  headers?: string[]
}) => {
  return (request: Request) => {
    const isPreflight = request.method === 'OPTIONS'
    const origin = (request.headers.get('origin') || '').toLowerCase().trim()

    const responseHeaders = new Headers()
    if (!origins.includes('*')) {
      responseHeaders.set('Vary', 'Origin')
    }
    if (credentials) {
      responseHeaders.set('Access-Control-Allow-Credentials', 'true')
    }

    if (isPreflight) {
      responseHeaders.set(
        'Access-Allow-Origin',
        origins.includes('*')
          ? origins.join(', ')
          : origins
              .filter((allowedOrigin) => allowedOrigin === origin)
              .join(', '),
      )
      if (maxAge !== undefined) {
        responseHeaders.set('Access-Control-Max-Age', String(maxAge))
      }
      if (methods.length) {
        responseHeaders.set('Access-Control-Allow-Methods', methods.join(', '))
      }
      if (headers.length) {
        responseHeaders.set('Access-Control-Allow-Headers', headers.join(', '))
      }
    }

    return {
      headers: Object.fromEntries(responseHeaders.entries()),
      isPreflight,
    }
  }
}

async function writeToStream(
  writer: WritableStreamDefaultWriter,
  payload:
    | {
        id?: string
        data?: string
        event?: string
      }
    | string,
) {
  const encoder = new TextEncoder()
  if (typeof payload === 'string') {
    await writer.write(encoder.encode(payload))
  } else {
    const { event, id, data } = payload
    if (event) {
      await writer.write(encoder.encode('event: ' + event + '\n'))
    }
    if (id) {
      await writer.write(encoder.encode('id: ' + id + '\n'))
    }
    if (data) {
      await writer.write(encoder.encode('data: ' + data + '\n'))
    }
    await writer.write(encoder.encode('\n'))
  }
}

const createHelixRequest = async (request: Request) => {
  const url = new URL(request.url)
  const searchParams = new URLSearchParams(url.search)
  const body = await request.text()

  return {
    body: body ? JSON.parse(body) : undefined,
    headers: request.headers,
    method: request.method,
    query: Object.fromEntries(searchParams),
  }
}

export default async <TContext>(
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
      headers: {
        'content-type': 'text/html',
      },
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
            result.headers.map(({ name, value }: any) => [name, value]),
          ),
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json; charset=utf-8',
        },
      })
    } else if (result.type === 'MULTIPART_RESPONSE') {
      return new Response('@stream/@defer directives are not supported', {
        status: 405,
      })
    } else if (result.type === 'PUSH') {
      const { readable, writable } = new TransformStream()
      const stream = writable.getWriter()

      setInterval(() => {
        writeToStream(stream, ':\n\n')
      }, 5000)

      result
        .subscribe((data: unknown) => {
          writeToStream(stream, {
            event: 'next',
            data: JSON.stringify(data),
          })
        })
        .then(() => {
          writeToStream(stream, 'event: complete\n\n')
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
    } else {
      return new Response('not supported', { status: 405 })
    }
  }
}
