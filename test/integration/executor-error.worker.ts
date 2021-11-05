import { makeExecutableSchema } from '@graphql-tools/schema'
import { wrapSchema } from '@graphql-tools/wrap'

import helixFlare, { createExecutor } from '../../src'

const typeDefs = /* GraphQL */ `
  type Query {
    error(byArg: Boolean, byContext: Boolean): String!
  }
`

const Worker: ExportedHandler<{ HELIX_OBJECT: any }> = {
  async fetch(request) {
    const executor = createExecutor<
      { byArg?: boolean },
      { byContext?: boolean }
    >(request, async (args, context) => {
      if (args.byArg) {
        throw new Error('Error by arg')
      }

      if (context.byContext) {
        throw new Error('Error by context')
      }

      throw new Error('Unexpected error')
    })

    const schema = wrapSchema({
      schema: makeExecutableSchema({ typeDefs }),
      executor,
    })

    return helixFlare(request, schema, {
      middlewares: [
        (resolve, parent, args, context, info) => {
          if (args.byContext) {
            context.byContext = true
          }

          return resolve(parent, args, context, info)
        },
      ],
    })
  },
}

export default Worker
