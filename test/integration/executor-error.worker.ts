import { makeExecutableSchema } from '@graphql-tools/schema'
import { wrapSchema } from '@graphql-tools/wrap'

import helixFlare, { createExecutor } from '../../src'

const typeDefs = /* GraphQL */ `
  type Query {
    hello: String!
  }
`

const Worker: ExportedHandler<{ HELIX_OBJECT: any }> = {
  async fetch(request) {
    const executor = createExecutor(request, async () => {
      throw new Error('Should propagate')
    })

    const schema = wrapSchema({
      schema: makeExecutableSchema({ typeDefs }),
      executor,
    })

    return helixFlare(request, schema)
  },
}

export default Worker
