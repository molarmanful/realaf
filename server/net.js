import geckos from '@geckos.io/server'
import { Worker } from 'node:worker_threads'
import { SnapshotInterpolation } from '@geckos.io/snapshot-interpolation'
import { snapModel } from '../common/schemas.js'

let preSnap = state => Object.entries(state).map(([id, { hue, pos, rot }]) => ({
  id,
  hue,
  x: pos[0], y: pos[1], z: pos[2],
  rot,
}))

export let geck = server => {
  let io = geckos()
  let SI = new SnapshotInterpolation()

  io.addServer(server)

  let state = {}

  let tick = new Worker(new URL('tick.js', import.meta.url))
  tick.postMessage(60)
  tick.on('message', ({ now, t }) => {
    if (t % 3n == 0) {
      let snap = SI.snapshot.create(preSnap(state))
      SI.vault.add(snap)
      io.raw.emit(snapModel.toBuffer(snap))
    }
  })

  io.onConnection(ch => {
    ch.onDisconnect(_ => {
      delete state[ch.id]
      io.emit('leave', ch.id, { reliable: true })
    })

    state[ch.id] = {
      hue: Math.random() * 360 | 0,
      pos: [0, 5, 0],
      rot: 0,
    }
    ch.emit('spawn', state, { reliable: true })

    for (let e of ['hue', 'pos', 'rot']) {
      ch.on(e, data => {
        state[ch.id][e] = data
      })
    }
  })

  return io
}