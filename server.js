import { fileURLToPath } from 'node:url'
import Fastify from 'fastify'
import FastifyVite from '@fastify/vite'
import { NET } from './server/net.js'

export let main = async dev => {
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

if (process.argv[1] == fileURLToPath(import.meta.url)) {
  let server = await main()
  new NET(server.server)
  await server.listen({ port: 3000 })
}