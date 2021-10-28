export const access = ({
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
