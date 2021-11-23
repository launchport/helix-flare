export type CreateAccessHeadersOptions = {
  origins?: Array<string | RegExp | ((request: Request) => boolean)>
  credentials?: boolean
  methods?: string[]
  maxAge?: number
  headers?: string[]
}

export const createAccessHeaders = ({
  origins = ['*'],
  credentials = false,
  methods = ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
  headers = [],
  maxAge,
}: CreateAccessHeadersOptions = {}) => {
  return (request: Request) => {
    const isPreflight = request.method === 'OPTIONS'
    const origin = (request.headers.get('origin') || '').toLowerCase().trim()

    const responseHeaders = new Headers()

    if (credentials) {
      responseHeaders.set('Access-Control-Allow-Credentials', 'true')
    }

    const allowOrigin = origins.includes('*')
      ? '*'
      : origins.some((allowedOrigin) =>
          typeof allowedOrigin === 'function'
            ? allowedOrigin(request)
            : allowedOrigin instanceof RegExp
            ? allowedOrigin.test(origin)
            : allowedOrigin === origin,
        )
      ? origin
      : ''

    responseHeaders.set('Access-Control-Allow-Origin', allowOrigin)

    if (allowOrigin !== '*') {
      responseHeaders.set('Vary', 'Origin')
    }

    if (isPreflight) {
      if (maxAge !== undefined) {
        responseHeaders.set('Access-Control-Max-Age', String(maxAge))
      }
      if (methods.length) {
        responseHeaders.set('Access-Control-Allow-Methods', methods.join(', '))
      }
      if (!headers.length) {
        const reqHeaders = request.headers.get('access-control-request-headers')

        if (reqHeaders) {
          responseHeaders.set('Access-Control-Allow-Headers', reqHeaders)
          responseHeaders.append('Vary', 'Access-Control-Allow-Headers')
        }
      } else {
        responseHeaders.set('Access-Control-Allow-Headers', headers.join(', '))
      }
    }

    return {
      headers: Object.fromEntries(responseHeaders.entries()),
      isPreflight,
    }
  }
}
