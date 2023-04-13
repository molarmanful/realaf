import { fileURLToPath } from 'node:url'
import Fastify from 'fastify'
import FastifyVite from '@fastify/vite'
import geckos, { iceServers } from '@geckos.io/server'

export async function main(dev) {
  let server = Fastify()
  let root = import.meta.url

  await server.register(FastifyVite, {
    dev: dev || process.argv.includes('--dev'),
    root,
    createRenderFunction: ({ App }) => _ => ({
      element: App.render().html
    })
  })

  server.get('/', (req, res) => {
    res.html(res.render())
  })

  await server.vite.ready()

  return server
}

function geck(server) {
  let io = geckos()

  io.addServer(server)

  io.onConnection(channel => {
    console.log('connected:', channel)
  })

  return io
}

if (process.argv[1] == fileURLToPath(new URL(import.meta.url))) {
  let server = await main()
  geck(server.server)
  await server.listen({ port: 3000 })
}