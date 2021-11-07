# helix-flare

`helix-flare` helps you build GraphQL services on [Cloudflare Workers®](https://workers.cloudflare.com/) using [`graphql-helix`](https://github.com/contrawork/graphql-helix).

## Features

- Build GraphQL server on Cloudflare Workers
- Delegate execution to Durable Objects (Workers act merely a proxy in this instance)
- Add middlewares
- Subscriptions with SSE

## Upcoming features

- Combine multiple worker to one endpoint

## Installation

```sh
yarn add helix-flare

## or

npm install --save helix-flare
```

## Usage

### Simple worker handler

`helixFlare(request: Request, schema: GraphQLSchema)` handles GraphQL requests and returns an appropriate response.

<details>

<summary>Show full example</summary>

```ts
import helixFlare from 'helix-flare'
import { makeExecutableSchema } from '@graphql-tools/schema'

export default {
  async fetch(request: Request) {
    const typeDefs = /* GraphQL */ `
      type Query {
        hello(name: String!): String!
      }
    `

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Query: {
          user: (_, { name }) => `Hello ${name}!`,
        },
      },
    })

    return helixFlare(request, schema)
  },
}
```

</details>

### Delegate execution to Durable Objects

`createExecutor(request: Request, selectDurableObject: (args: Record<string, any | undefined>, context: undefined | TContext)` allows you to select your durable object in the worker, before forwarding the graphql request to it. You have access the graphql variables, parameters and the query or mutation the user is doing.

<details>

<summary>Show full example</summary>

```ts
// worker.ts
import helixFlare, { createExecutor } from 'helix-flare'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { wrapSchema } from '@graphql-tools/wrap'

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
      executor: createExecutor<{ postId?: string }>(request, async (args) => {
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

**Shared schema**:

```ts
// schema.ts
const schema = /* GraphQL */ `
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
export default schema
```

```ts
// worker.ts
import helixFlare, { createExecutor } from 'helix-flare'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { wrapSchema } from '@graphql-tools/wrap'
import typeDefs from './schema'

export { Post } from './PostObject'

// ExportedHandler from `@cloudflare/workers-types`
type WorkerType = ExportedHandler<{ PostDurableObject: DurableObjectStub }>

const Worker: WorkerType = {
  async fetch(request, env) {
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

export default Worker
```

```ts
// PostObject.ts
import { makeExecutableSchema } from '@graphql-tools/schema'
import { wrapSchema } from '@graphql-tools/wrap'
import helixFlare, { createExecutor, createSubscription } from 'helix-flare'
import typeDefs from './typedefs'

export class Post implements DurableObject {
  private likes = 0

  async fetch() {
    const [emitLikes, likesSubscriptionResolver] = createSubscription<
      number,
      { subscribePostVotes: number }
    >({
      topic: 'likes',
      resolve: (value) => ({ subscribePostVotes: value }),
      getInitialValue: () => this.likes,
    })

    const resolvers = {
      Mutation: {
        upvotePost: () => {
          this.likes++
          emitLikes(this.likes)

          return { likes: this.likes, id: this.state.id }
        },
      },
      Subscription: {
        subscribePostVotes: {
          subscribe: () => likesSubscriptionResolver,
        },
      },
    }

    const schema = makeExecutableSchema({
      resolvers,
      typeDefs,
    })

    return helixFlare(request, schema)
  }
}
```

</details>

### Combine multiple worker to one endpoint (stitching)

`@todo`
