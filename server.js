import { fileURLToPath } from 'node:url'
import Fastify from 'fastify'
import FastifyVite from '@fastify/vite'
import geckos from '@geckos.io/server'
import { Worker } from 'node:worker_threads'

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

let geck = server => {
  let io = geckos()

  io.addServer(server)

  let state = {}

  let tick = new Worker('./server/tick.js')
  tick.postMessage(20)
  tick.on('message', now => {
    io.emit('ping', state)
  })

  io.onConnection(ch => {
    ch.onDisconnect(_ => {
      delete state[ch.id]
      io.emit('die', ch.id, { reliable: true })
    })

    let data = { pos: [0, 3, 0], rot: [0, 0, 0, 1] }
    state[ch.id] = data
    io.emit('spawn', { id: ch.id, data, state }, { reliable: true })

    ch.on('pong', data => {
      state[ch.id] = data
    })
  })

  return io
}

if (process.argv[1] == fileURLToPath(new URL(import.meta.url))) {
  let server = await main()
  geck(server.server)
  await server.listen({ port: 3000 })
}