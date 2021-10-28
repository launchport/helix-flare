import { makeExecutableSchema } from '@graphql-tools/schema'

import helixFlare from '../src'

export default {
  async fetch(request: Request) {
    const typeDefs = /* GraphQL */ `
      type Query {
        user: String!
      }
    `

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Query: {
          user: () => 'John Doe',
        },
      },
    })

    return helixFlare(request, schema)
  },
}
