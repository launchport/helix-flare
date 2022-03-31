export const createHelixRequest = async (request: Request) => {
  const url = new URL(request.url)
  const query = Object.fromEntries(new URLSearchParams(url.search))

  const body =
    request.method === 'POST' ? await request.clone().json() : undefined

  return {
    body,
    headers: request.headers,
    method: request.method,
    query,
  }
}
