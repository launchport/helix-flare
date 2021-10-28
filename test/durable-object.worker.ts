import { makeExecutableSchema } from '@graphql-tools/schema'
import { wrapSchema } from '@graphql-tools/wrap'

import helixFlare from '../src'
import { createExecutor } from '../src/createExecutor'
import { buildSchema } from 'graphql'

const Worker: ExportedHandler<{ HELIX_OBJECT: any }> = {
  async fetch(request, env) {
    const schema = wrapSchema({
      schema: buildSchema(typeDefs),
      executor: createExecutor(request, async (args) => {
        const doId = args.liveId
          ? env.HELIX_OBJECT.idFromString(args.liveId)
          : env.HELIX_OBJECT.idFromName('someRandomId')

        return env.HELIX_OBJECT.get(doId)
      }),
    })

    return helixFlare(request, schema)
  },
}

const typeDefs = /* GraphQL */ `
  type Mutation {
    start: Boolean!
    stop: Boolean!
  }

  type Query {
    status: String!
  }
`

export class HelixObject {
  status: 'started' | 'stopped' | 'paused' = 'stopped'

  async fetch(request: Request) {
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Mutation: {
          start: () => {
            this.status = 'started'
            return true
          },
          stop: () => {
            this.status = 'stopped'
            return true
          },
        },
        Query: {
          status: () => this.status,
        },
      },
    })

    return helixFlare(request, schema)
  }
}
export default Worker
