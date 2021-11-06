import type { Response } from 'graphql-helix'

const getResponse = (result: Response<any, any>) => {
  return new Response(JSON.stringify(result.payload), {
    status: result.status,
    headers: {
      ...Object.fromEntries(
        result.headers.map(({ name, value }) => [name, value]),
      ),
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

export default getResponse
