/**
  This file was taken from https://github.com/Azure/fetch-event-source and has been modified for `helix-flare`

  MIT License
  Copyright (c) Microsoft Corporation.
  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE
**/
import { getBytes, getLines, getMessages } from './parseSSE'
import type { EventSourceMessage } from './parseSSE'

export const EventStreamContentType = 'text/event-stream'

const DefaultRetryInterval = 1000
const LastEventId = 'last-event-id'

// might want to revert to standard types: https://github.com/cloudflare/workers-types/issues/116
export interface FetchEventSourceInit extends RequestInitializerDict {
  headers?: Record<string, string>
  onMessage?: (ev: EventSourceMessage) => void
  onClose?: () => void
  onError?: (err: any) => number | null | undefined | void
  fetch?: typeof fetch
}

export function fetchEventSource(
  input: Request | string,
  {
    signal: inputSignal,
    headers: inputHeaders,
    onMessage,
    onClose,
    onError,
    fetch: fetchFn = fetch,
    ...rest
  }: FetchEventSourceInit,
) {
  return new Promise<void>((resolve, reject) => {
    const headers = { ...inputHeaders }
    if (!headers.accept) {
      headers.accept = EventStreamContentType
    }

    const requestController = new AbortController()

    let retryInterval = DefaultRetryInterval
    let retryTimer: ReturnType<typeof setTimeout>
    function dispose() {
      clearTimeout(retryTimer)
      requestController.abort()
    }

    ;(inputSignal as any)?.addEventListener('abort', () => {
      dispose()
      resolve()
    })

    async function execute() {
      try {
        const response = await fetchFn(input, {
          ...rest,
          headers,
          // signal: requestController.signal,
        })

        await getBytes(
          response.body!,
          getLines(
            getMessages(
              (id) => {
                if (id) {
                  // store the id and send it back on the next retry:
                  headers[LastEventId] = id
                } else {
                  // don't send the last-event-id header anymore:
                  delete headers[LastEventId]
                }
              },
              (retry) => {
                retryInterval = retry
              },
              onMessage,
            ),
          ),
        )

        onClose?.()
        dispose()
        resolve()
      } catch (err) {
        console.log(err)
        if (!requestController.signal.aborted) {
          // if we haven't aborted the request ourselves:
          try {
            // check if we need to retry:
            const interval: any = onError?.(err) ?? retryInterval
            clearTimeout(retryTimer)
            retryTimer = setTimeout(execute, interval)
          } catch (innerErr) {
            // we should not retry anymore:
            dispose()
            reject(innerErr)
          }
        }
      }
    }
    execute()
  })
}
