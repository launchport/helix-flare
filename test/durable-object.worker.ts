import { makeExecutableSchema } from '@graphql-tools/schema'
import { wrapSchema } from '@graphql-tools/wrap'

import helixFlare, { createExecutor } from '../src'

const typeDefs = /* GraphQL */ `
  type Mutation {
    start: String!
  }

  type Query {
    status(id: String!): String!
  }
`

const Worker: ExportedHandler<{ HELIX_OBJECT: any }> = {
  async fetch(request, env) {
    const executor = createExecutor<any, { id?: string }>(
      request,
      async (args, context) => {
        // @todo test for context
        console.log({ context })
        const doId = args.id
          ? env.HELIX_OBJECT.idFromString(args.id)
          : env.HELIX_OBJECT.idFromName('someRandomId')

        return env.HELIX_OBJECT.get(doId)
      },
    )

    const schema = wrapSchema({
      schema: makeExecutableSchema({ typeDefs }),
      executor,
    })

    return helixFlare(request, schema, {
      middlewares: [
        (resolve, root, args, context, info) => {
          context.foo = 'bar'

          return resolve(root, args, context, info)
        },
      ],
    })
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
          start: (_, __, ctx) => {
            this.status = 'started'
            return this.state.id.toString()
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
