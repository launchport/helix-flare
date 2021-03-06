import { makeExecutableSchema } from '@graphql-tools/schema'
import { wrapSchema } from '@graphql-tools/wrap'

import helixFlare, { createExecutor } from '../../src'

const typeDefs = /* GraphQL */ `
  type Mutation {
    start: String!
  }

  type Query {
    status(id: String!): String!
    doId: String!
  }
`

const Worker: ExportedHandler<{ HELIX_OBJECT: DurableObjectNamespace }> = {
  async fetch(request, env) {
    const executor = createExecutor<{ id?: string }>(request, async (args) => {
      const doId = args.id
        ? env.HELIX_OBJECT.idFromString(args.id)
        : env.HELIX_OBJECT.idFromName('someRandomId')

      return env.HELIX_OBJECT.get(doId)
    })

    const schema = wrapSchema({
      schema: makeExecutableSchema({ typeDefs }),
      executor,
    })

    return helixFlare(request, schema)
  },
}

export class HelixObject {
  private state: DurableObjectState
  private status: 'started' | 'stopped' | 'paused' = 'stopped'

  constructor(state: DurableObjectState) {
    this.state = state
  }

  async fetch(request: Request) {
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Mutation: {
          start: () => {
            this.status = 'started'
            return this.state.id.toString()
          },
        },
        Query: {
          status: () => this.status,
          doId: () => this.state.id.toString(),
        },
      },
    })

    return helixFlare(request, schema)
  }
}
export default Worker
