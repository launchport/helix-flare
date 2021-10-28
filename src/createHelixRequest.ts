export const createHelixRequest = async (request: Request) => {
  const url = new URL(request.url)
  const searchParams = new URLSearchParams(url.search)
  const body = await request.text()

  return {
    body: body ? JSON.parse(body) : undefined,
    headers: request.headers,
    method: request.method,
    query: searchParams.toString(),
  }
}
