export const createHelixRequest = async (request: Request) => {
  const url = new URL(request.url)
  const query = Object.fromEntries(new URLSearchParams(url.search))

  return {
    body: request.method === 'POST' ? await request.json() : undefined,
    headers: request.headers,
    method: request.method,
    query,
  }
}
