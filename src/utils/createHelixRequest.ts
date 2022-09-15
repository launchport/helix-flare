import {type Request as HelixRequest} from 'graphql-helix'
export const createHelixRequest = async (request: Request): Promise<HelixRequest> => {
  const url = new URL(request.url)
  const query = Object.fromEntries(new URLSearchParams(url.search))

  const body =
    request.method === 'POST' ? await request.json() : undefined

  return {
    body: body,
    headers: request.headers,
    method: request.method,
    query,
  }
}
