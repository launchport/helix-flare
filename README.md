# helix-flare

`helix-flare` helps you build GraphQL services on [Cloudflare Workers®](https://workers.cloudflare.com/) using [`graphql-helix`](https://github.com/contrawork/graphql-helix).

**Features:**

- Add middlewares to your graphql service
- Delegate execution to Durable Objects
- Subscriptions with SSE
- Combine multiple worker to one endpoint

## Usage

### Delegate execution to Durable Objects

`createExecutor(request: Request, selectDurableObject: (args: Record<string, any | undefined>, context: undefined | TContext)` allows you to select your durable object in the worker, before forwarding the graphql request to it. You have access the graphql variables, parameters and the query or mutation the user is doing.

<details>

<summary>Show full example</summary>

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

        const doId = env.PostDurableObject.idFromString(args.postId)
        return env.PostDurableObject.get(doId)
      }),
    })

    return helixFlare(request, schema)
  },
}
```

</details>

### Subscriptions with SSE

Subscriptions work out of the box with [SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events). They can be done in worker but will be used in durable objects most of the time.

<details>

<summary>Show full example</summary>

```ts
// typedefs.ts
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

        const doId = env.PostDurableObject.idFromString(args.postId)
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
            likes: this.likes.value(),
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

</details>

### Combine multiple worker to one endpoint (stitching)
