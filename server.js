import { fileURLToPath } from 'node:url'
import Fastify from 'fastify'
import FastifyVite from '@fastify/vite'
import geckos from '@geckos.io/server'

export async function main(dev) {
  let server = Fastify()
  let root = import.meta.url

  await server.register(FastifyVite, {
    dev: dev || process.argv.includes('--dev'),
    root,
    spa: true,
  })

  server.get('/', (req, res) => {
    res.html()
  })

  await server.vite.ready()

  return server
}

function geck(server) {
  let io = geckos()

  io.addServer(server)

  io.onConnection(channel => {

  })

  return io
}

if (process.argv[1] == fileURLToPath(new URL(import.meta.url))) {
  let server = await main()
  geck(server.server)
  await server.listen({ port: 3000 })
}