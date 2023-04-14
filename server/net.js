import geckos from '@geckos.io/server'
import { Worker } from 'node:worker_threads'
import { SnapshotInterpolation } from '@geckos.io/snapshot-interpolation'

let preSnap = state => Object.entries(state).map(([id, { pos, rot }]) => {
  pos = pos.map(n => parseFloat(n.toFixed(2)))
  rot = rot.map(n => parseFloat(n.toFixed(2)))
  return {
    id,
    x: pos[0], y: pos[1], z: pos[2],
    q: { x: rot[0], y: rot[1], z: rot[2], w: rot[3], }
  }
})

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
      io.emit('state', snap)
    }
  })

  io.onConnection(ch => {
    ch.onDisconnect(_ => {
      delete state[ch.id]
      io.emit('leave', ch.id, { reliable: true })
      console.log('leave', ch.id)
    })

    let data = { pos: [0, 5, 0], rot: [0, 0, 0, 1] }
    state[ch.id] = data
    ch.emit('spawn', state, { reliable: true })

    for (let e of ['pos', 'rot']) {
      ch.on(e, data => {
        state[ch.id][e] = data
      })
    }
  })

  return io
}