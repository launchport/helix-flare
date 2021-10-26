# helix-flare

helix-flare helps you build graphql services on cloudflare workers using graphql-helix.

You can:

- Add middlewares to your graphql service
- Delegate execution to Durable Objects
- Subscriptions with SSE
- Combine multiple worker to one endpoint

## Examples

### Delegate execution to Durable Objects

The `createExecutor()` function allows you to select your durable object in the worker, before forwarding the graphql request to it. You have access the graphql variables, parameters and the query or mutation the user is doing.

```ts
// worker.ts
import { makeExecutableSchema } from '@graphql-tools/schema'
import { wrapSchema } from '@graphql-tools/wrap'
import helixFlare, { createExecutor } from 'helix-flare'

const typeDefs = /* GraphQL */ `
  type Post {
    id: Int!
    title: String
    votes: Int
  }

  type Mutation {
    upvotePost(postId: Int!): Post
  }
`
export default {
  async fetch(request: Request, env: Env) {
    const schema = wrapSchema({
      schema: makeExecutableSchema({ typeDefs }),
      executor: createExecutor(request, async (args, context) => {
        if (!args.postId) {
          throw new Error('No postId argument found')
        }

        const doId = env.PostDurableObject.idFromString(args.liveId)
        return env.PostDurableObject.get(doId)
      }),
    })

    return helixFlare(request, schema)
  },
}
```

### Subscriptions with SSE

The `createExecutor()` function allows you to select your durable object in the worker, before forwarding the graphql request to it. You have access the graphql variables, parameters and the query or mutation the user is doing.

```ts
// typedef.ts
const typeDefs = /* GraphQL */ `
  type Post {
    id: Int!
    votes: Int
  }

  type Subscription {
    """
    Returns the positions for given live Id
    """
    subscribePostVotes(postId: Int!): Int!
  }

  type Mutation {
    upvotePost(postId: Int!): Post
  }
`
export default typeDefs
```

```ts
// worker.ts
import { makeExecutableSchema } from '@graphql-tools/schema'
import { wrapSchema } from '@graphql-tools/wrap'
import helixFlare, { createExecutor } from 'helix-flare'
import typeDefs from './typedefs'

export { Post } from './Post'

export default {
  async fetch(request: Request, env: Env) {
    const schema = wrapSchema({
      schema: makeExecutableSchema({ typeDefs }),
      executor: createExecutor(request, async (args, context) => {
        if (!args.postId) {
          throw new Error('No postId argument found')
        }

        const doId = env.PostDurableObject.idFromString(args.liveId)
        return env.PostDurableObject.get(doId)
      }),
    })

    return helixFlare(request, schema)
  },
}
```

```ts
// post.ts
import { makeExecutableSchema } from '@graphql-tools/schema'
import { wrapSchema } from '@graphql-tools/wrap'
import helixFlare, { createExecutor } from 'helix-flare'
import typeDefs from './typedefs'
import { BehaviorSubject } from 'rxjs'

export class Post implements DurableObject {
  private likes?: BehaviorSubject<number>

  constructor(state: DurableObjectState, env: Env) {
    this.likes = new BehaviorSubject(0)
  }

  async fetch() {
    const resolvers = {
      Mutation: {
        upvotePost: () => {
          // increase likes by one
          this.likes.next(this.likes.value() + 1)
          return {
            likes: this.likes.value()
            id: this.state.id,
          }
        },
      },
      Subscription: {
        subscribePostVotes: {
          subscribe: () => observableToAsyncIterable(this.likes),
        },
      },
    }

    const schema = makeExecutableSchema({
      resolvers,
      typeDefs,
    })

    return helixflare(request, schema)
  }
}
```

### Combine multiple worker to one endpoint (stichting)
