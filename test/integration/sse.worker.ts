import { makeExecutableSchema } from '@graphql-tools/schema'
import { wrapSchema } from '@graphql-tools/wrap'
import type { IResolvers } from 'graphql-middleware/dist/types'

import helixFlare, { createExecutor, createSubscription } from '../../src'

const typeDefs = /* GraphQL */ `
  type Query {
    upvotes(articleId: ID!): Int!
  }

  type Mutation {
    upvote(articleId: ID!): Boolean
  }

  type Subscription {
    upvotes(articleId: ID!): Int!
  }
`

export class NewsArticleObject implements DurableObject {
  private upvotes = 0

  async fetch(request: Request) {
    const [emitUpvote, upvoteResolver] = createSubscription<
      number,
      { upvotes: number }
    >({
      topic: 'UPVOTE',
      resolve: (value) => ({ upvotes: value }),
      getInitialValue: () => this.upvotes,
    })

    const resolvers: IResolvers = {
      Mutation: {
        upvote: () => {
          this.upvotes++
          emitUpvote(this.upvotes)

          return this.upvotes
        },
      },
      Subscription: {
        upvotes: {
          subscribe: upvoteResolver,
        },
      },
    }

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    })

    return helixFlare(request, schema)
  }
}

export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url)
    if (url.pathname !== '/graphql') {
      return new Response('Not found', { status: 404 })
    }
    if (request.method === "OPTIONS") {
      return new Response('OK', {status: 200})
    }
    const schema = wrapSchema({
      schema: makeExecutableSchema({ typeDefs }),
      executor: createExecutor<{ articleId?: string }>(
        request,
        async (args) => {
          const doId = env.NEWS_ARTICLE_OBJECT.idFromName(args.articleId)

          return env.NEWS_ARTICLE_OBJECT.get(doId)
        },
      ),
    })

    return helixFlare(request, schema)
  },
}
