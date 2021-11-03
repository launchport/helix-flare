import { makeExecutableSchema } from '@graphql-tools/schema'

import helixFlare from '../src'

export default {
  async fetch(request: Request) {
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
