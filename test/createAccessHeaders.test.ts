import { Headers, Request, Response, fetch } from 'undici'
import { createAccessHeaders } from '../src/createAccessHeaders'

// polyfill
;(global as any).Headers = Headers
;(global as any).Request = Request
;(global as any).Response = Response
;(global as any).fetch = fetch

describe('createAccessHeaders', () => {
  it('should allow exact access', () => {
    const cors = createAccessHeaders({ origins: ['http://graphql.local'] })

    const req = new Request('https://example.io', {
      method: 'OPTIONS',
      headers: {
        origin: 'http://graphql.local',
      },
    })

    expect(
      cors(req as any).headers['access-control-allow-origin'],
    ).toMatchInlineSnapshot(`"http://graphql.local"`)
  })

  it('should allow regex access', () => {
    const cors = createAccessHeaders({ origins: [/graphql\.io/] })

    const req = new Request('https://example.io', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://graphql.io',
      },
    })

    expect(
      cors(req as any).headers['access-control-allow-origin'],
    ).toMatchInlineSnapshot(`"https://graphql.io"`)
  })

  it('should receive all headers', () => {
    const cors = createAccessHeaders({
      origins: [/graphql\.io/],
      methods: ['POST'],
      headers: ['x-lib'],
      maxAge: 3600,
    })

    const req = new Request('https://example.io', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://graphql.io',
      },
    })

    expect(cors(req as any)).toMatchInlineSnapshot(`
      Object {
        "headers": Object {
          "access-control-allow-credentials": "true",
          "access-control-allow-headers": "x-lib",
          "access-control-allow-methods": "POST",
          "access-control-allow-origin": "https://graphql.io",
          "access-control-max-age": "3600",
          "vary": "Origin",
        },
        "isPreflight": true,
      }
    `)
  })
})
