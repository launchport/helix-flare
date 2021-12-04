import { writeToStream } from './writeToStream'
import { type Push } from 'graphql-helix'

const getPushResponseSSE = (result: Push<any, any>, request: Request) => {
  const { readable, writable } = new TransformStream()
  const stream = writable.getWriter()

  const intervalId = setInterval(() => {
    writeToStream(stream, ':\n\n')
  }, 15000)

  ;(request.signal as any)?.addEventListener('abort', () => {
    clearInterval(intervalId)

    try {
      stream.close()
    } catch {}
  })

  result
    .subscribe(async (data) => {
      await writeToStream(stream, {
        event: 'next',
        data: JSON.stringify(data),
      })
    })
    .then(async () => {
      clearInterval(intervalId)
      await writeToStream(stream, { event: 'complete' })
      await stream.close()
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
}

export default getPushResponseSSE
