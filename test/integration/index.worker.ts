import { makeExecutableSchema } from '@graphql-tools/schema'

import helixFlare, {
  shouldRenderGraphiQL,
  getGraphiQLResponse,
} from '../../src'

export default {
  async fetch(request: Request) {
    if (await shouldRenderGraphiQL(request)) {
      return getGraphiQLResponse()
    }

    const typeDefs = /* GraphQL */ `
      type Query {
        user: String!
        context: String!
      }
    `

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Query: {
          user: () => 'John Doe',
          context: (_, __, context) => context.color,
        },
      },
    })

    return helixFlare(request, schema, {
      contextFactory: () => ({ color: 'papaya' }),
    })
  },
}
