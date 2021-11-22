# helix-flare

`helix-flare` helps you build GraphQL services on [Cloudflare Workers®](https://workers.cloudflare.com/) in an instant.

With help of the great library [`graphql-helix`](https://github.com/contrawork/graphql-helix) this is made possible.

## Features

- Build GraphQL server on Cloudflare Workers in seconds
- Delegate execution to [Durable Objects](https://developers.cloudflare.com/workers/runtime-apis/durable-objects). Workers will only act as a proxy in this instance
- Add middlewares and context
- Live subscriptions (over SSE)

## Upcoming

- Combine multiple worker to one endpoint (stitch)

## Installation

```sh
yarn add helix-flare

## or

npm install --save helix-flare
```

## API

### <code>helixFlare(request: Request, schema: GraphQLSchema)</code>

**Returns: <code>Promise\<Response></code>**

This will take a request from a worker (or durable object) and return a response via GraphQL.

All you need is:

```ts
import helixFlare from 'helix-flare'
import { makeExecutableSchema } from '@graphql-tools/schema'

export default {
  async fetch(request: Request) {
    const typeDefs = /* GraphQL */ `
      type Query {
        hello: String!
      }
    `
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Query: { user: () => 'Hello World 🌍' },
      },
    })

    return helixFlare(request, schema)
  },
}
```

With just a few lines you got your GraphQL server up and running.

**Example call to worker:**

```ts
const workerURL = 'https://my.worker.dev/graphql'

fetch(workerURL, {
  body: JSON.stringify({ query: '{ hello }' }),
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
})

// ➜ 'Hello World 🌍'
```

_Head to the [GraphQL docs](https://graphql.org/) for more information on how to build a GraphQL server._

### <code>createExecutor(request, selectDurableObject)</code>

**Returns: <a href="https://www.graphql-tools.com/docs/remote-schemas#creating-an-executor"><code>AsyncExecutor</code></a>**

#### <code><b>request: Request</b></code>

The request passed to the worker or durable object.

#### <code><b>selectDurableObject: (args, context) => Promise&lt;DurableObjectStub></b></code>

With this callback function you can select which durable object this request should be delegated to.

```ts
import helixFlare, { createExecutor } from 'helix-flare'
import { makeExecutableSchema } from '@graphql-tools/schema'

export default {
  async fetch(request, env) {
    const schema = makeExecutableSchema({
      // schema and resolvers here…

      // with this executor the requests will be delegated a durable object
      executor: createExecutor(request, async (args) => {
        return env.DURABLE_OBJECT.get(args.userId)
      }),
    })

    return helixFlare(request, schema)
  },
}
```

## Examples

<details>
<summary><b>Simple resolver with arguments</b></summary>

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

<details>
  <summary><b>Delegate execution to durable objects</b></summary>

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

<details>
  <summary><b>Subscriptions over server-sent events</b></summary>

Subscriptions work out of the box with [SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events). They can be done in worker but will be used in durable objects most of the time.

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

<details>
  <summary><b>Combine multiple worker to one endpoint (stitching)</b></summary>

`@todo`

</details>
