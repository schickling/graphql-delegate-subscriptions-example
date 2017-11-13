import { createServer } from 'http'
import * as ws from 'ws'
import { SubscriptionServer, SubscriptionClient } from 'subscriptions-transport-ws'
import * as express from 'express'
import * as bodyParser from 'body-parser'
import fetch from 'node-fetch'
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express'
import { PubSub } from 'graphql-subscriptions'
import { execute, subscribe, print, Kind } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'
import { Delegate } from 'graphql-delegate'
import { HttpLink } from 'apollo-link-http'
import expressPlayground from 'graphql-playground-middleware-express'

async function run() {
  const pubsub = new PubSub()

  const link = new HttpLink({
    uri: 'https://api.graph.cool/simple/v1/cizfapt9y2jca01393hzx96w9',
    fetch,
  })
  const delegate = new Delegate(link)

  // initializes the remote schema
  await delegate.init()

  const typeDefs = delegate.extractMissingTypes(`
  type Query {
    hello: String!
  }

  type Subscription {
    Message: MessageSubscriptionPayload
  }
  `)

  const GRAPHQL_ENDPOINT = 'wss://subscriptions.graph.cool/v1/cizfapt9y2jca01393hzx96w9'
  const client = new SubscriptionClient(GRAPHQL_ENDPOINT, { reconnect: true }, ws)

  const resolvers = {
    Query: {
      hello: () => 'Hello World',
    },
    Subscription: {
      Message: {
        subscribe: (parent, args, ctx, info) => {
          console.log('connecting');
          const fragments = Object.keys(info.fragments).map(
            fragment => info.fragments[fragment],
          )
          const document = {
            kind: Kind.DOCUMENT,
            definitions: [info.operation, ...fragments],
          }
          const query = print(document)
          console.log(query);
          const observable = client.request({ query })
          observable.subscribe({
            next: (data) => {
              console.log(data);
              pubsub.publish(query, data.data)
            },
          })
          return pubsub.asyncIterator(query)
        },
      },
    },
  }

  const schema = makeExecutableSchema({ typeDefs, resolvers })

  const WS_PORT = 5000

  // Create WebSocket listener server
  const websocketServer = createServer((request, response) => {
    response.writeHead(404)
    response.end()
  })

  websocketServer.listen(WS_PORT, () => console.log(
    `Websocket Server is now running on http://localhost:${WS_PORT}`
  ))

  const subscriptionServer = SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
    },
    {
      server: websocketServer,
      path: '/graphql',
    },
  )

  const app = express()

  // bodyParser is needed just for POST.
  app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }))
  app.get('/graphiql', expressPlayground({
    endpoint: '/graphql',
    subscriptionEndpoint: `ws://localhost:5000/graphql`,
  })) // if you want GraphiQL enabled

  const PORT = 3000
  app.listen(PORT)
}

run().catch(console.log.bind(console))
