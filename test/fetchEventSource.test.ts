import { fetch } from 'undici'
import { jest } from '@jest/globals'

import http from 'node:http'
import net from 'node:net'

import { fetchEventSource } from '../src/fetchEventSource'

let url: string
let server: http.Server

beforeAll(async () => {
  server = http.createServer()
  await new Promise<void>((resolve) => server.listen(0, resolve))

  const { port } = server.address() as net.AddressInfo
  url = `http://localhost:${port}`
})

afterAll(() => server.close())
afterEach(() => server.removeAllListeners())

describe('fetchEventSource', () => {
  it('should handle simple response', async () => {
    server.on('request', async (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      })
      res.write('id: 1337\n')
      res.write('event: next\n')
      res.write('data: hello\n')
      res.write('\n')
      res.end()
    })

    const result = await new Promise((resolve) => {
      fetchEventSource(url, {
        onMessage: resolve,
        fetch: fetch as any,
      })
    })

    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": "hello",
        "event": "next",
        "id": "1337",
        "retry": undefined,
      }
    `)
  })

  it('should handle split data in chunks', async () => {
    server.on('request', async (req, res) => {
      // `\r` should be ignored
      res.write('event: next\r\n')
      res.write('data:')

      await new Promise((resolve) => setTimeout(resolve, 100))

      res.write('hello world\n')
      res.write('\n')
      res.end()
    })

    const result = await new Promise((resolve) => {
      fetchEventSource(url, {
        onMessage: resolve,
        fetch: fetch as any,
      })
    })

    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": "hello world",
        "event": "next",
        "id": "",
        "retry": undefined,
      }
    `)
  })

  it('should abort', async () => {
    server.on('request', async (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      })
      res.write('event: next\n')
      res.write('data: hello\n')
      res.write('\n')
    })

    const ac = new AbortController()

    const sse = fetchEventSource(url, {
      signal: ac.signal,
      fetch: fetch as any,
    })

    process.nextTick(() => ac.abort())

    await expect(sse).resolves.toBeUndefined()
    expect(ac.signal.aborted).toBe(true)
  })
})
