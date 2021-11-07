import { Headers, Request, Response, fetch } from 'undici'
import { createAccessHeaders } from '../src/createAccessHeaders'

// polyfill
;(global as any).Headers = Headers
;(global as any).Request = Request
;(global as any).Response = Response
;(global as any).fetch = fetch

describe('createAccessHeaders', () => {
  it('only OPTIONS should be preflight', () => {
    const optReq = new Request('https://example.io', { method: 'OPTIONS' })
    const getReq = new Request('https://example.io', { method: 'GET' })

    const cors = createAccessHeaders()

    expect(cors(optReq as any).isPreflight).toBe(true)
    expect(cors(getReq as any).isPreflight).toBe(false)
  })
  it('should send correct headers for methods', () => {
    const optReq = new Request('https://api.launchport.io/key', {
      method: 'OPTIONS',
      headers: { origin: 'https://launchport.io' },
    })
    const postReq = new Request('https://api.launchport.io/key', {
      method: 'POST',
      headers: { origin: 'https://launchport.io' },
    })

    const cors = createAccessHeaders({
      methods: ['PUT', 'DELETE'],
      origins: ['https://launchport.io', 'https://api.launchport.io'],
      credentials: true,
    })

    expect(cors(optReq as any).headers).toMatchInlineSnapshot(`
      Object {
        "access-control-allow-credentials": "true",
        "access-control-allow-methods": "PUT, DELETE",
        "access-control-allow-origin": "https://launchport.io",
        "vary": "Origin",
      }
    `)
    expect(cors(postReq as any).headers).toMatchInlineSnapshot(`
      Object {
        "access-control-allow-credentials": "true",
        "access-control-allow-origin": "https://launchport.io",
        "vary": "Origin",
      }
    `)
  })
  it('should allow exact access', () => {
    const cors = createAccessHeaders({
      origins: ['http://graphql.local'],
      credentials: true,
    })

    const preReq = new Request('https://example.io', {
      method: 'OPTIONS',
      headers: { origin: 'http://graphql.local' },
    })

    const req = new Request('https://example.io', {
      method: 'GET',
      headers: { origin: 'http://graphql.local' },
    })

    expect(cors(req as any).headers).toMatchInlineSnapshot(`
      Object {
        "access-control-allow-credentials": "true",
        "access-control-allow-origin": "http://graphql.local",
        "vary": "Origin",
      }
    `)

    expect(cors(preReq as any).headers).toMatchInlineSnapshot(`
      Object {
        "access-control-allow-credentials": "true",
        "access-control-allow-methods": "GET, HEAD, PUT, POST, DELETE, OPTIONS",
        "access-control-allow-origin": "http://graphql.local",
        "vary": "Origin",
      }
    `)
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

  it('should allow callback access', () => {
    const cors = createAccessHeaders({
      origins: [(req) => req.headers.get('x-header') === '1'],
    })

    const req = new Request('https://example.io', {
      method: 'OPTIONS',
      headers: {
        'x-header': '1',
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
      maxAge: 3600,
      credentials: true,
    })

    const req = new Request('https://example.io', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://graphql.io',
        'access-control-request-headers': 'cache-control',
      },
    })

    expect(cors(req as any)).toMatchInlineSnapshot(`
      Object {
        "headers": Object {
          "access-control-allow-credentials": "true",
          "access-control-allow-headers": "cache-control",
          "access-control-allow-methods": "POST",
          "access-control-allow-origin": "https://graphql.io",
          "access-control-max-age": "3600",
          "vary": "Origin, Access-Control-Allow-Headers",
        },
        "isPreflight": true,
      }
    `)
  })

  it('should respect custom allowed headers', () => {
    const cors = createAccessHeaders({
      headers: ['x-custom-request', 'content-type'],
    })
    const req = new Request('https://example.io', { method: 'OPTIONS' })

    expect(cors(req as any).headers['access-control-allow-headers']).toEqual(
      'x-custom-request, content-type',
    )
  })
})
