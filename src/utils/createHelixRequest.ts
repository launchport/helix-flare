export const createHelixRequest = async (request: Request) => {
  const url = new URL(request.url)
  const query = Object.fromEntries(new URLSearchParams(url.search))
  let body = {}

  try {
    body = await request.clone().json()
  } catch {}

  return {
    body: request.method === 'POST' ? body : undefined,
    headers: request.headers,
    method: request.method,
    query,
  }
}
