import type { Response } from 'graphql-helix'

const getResponse = (
  result: Response<any, any>,
  headers?: Record<string, string>,
) => {
  const resultHeaders = Object.fromEntries(
    result.headers.map(({ name, value }) => [name, value]),
  )

  return new Response(JSON.stringify(result.payload), {
    status: result.status,
    headers: {
      ...resultHeaders,
      ...headers,
    },
  })
}

export default getResponse
