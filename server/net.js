import geckos from '@geckos.io/server'
import { Worker } from 'node:worker_threads'
import { SnapshotInterpolation } from '@geckos.io/snapshot-interpolation'
import { snapModel } from '../common/schemas.js'
import VARS from '../common/config.js'

let idMap = { T: {}, F: {} }
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
  tick.postMessage(VARS.sTicks)
  tick.on('message', ({ now, t }) => {
    if (t % VARS.tickDiv == 0) {
      let snap = SI.snapshot.create(preSnap(state))
      SI.vault.add(snap)
      io.raw.emit(snapModel.toBuffer(snap))
    }
  })

  let idC = 0
  io.onConnection(ch => {
    idMap.T[ch.id] = idC
    idMap.F[idC] = ch.id

    let id = idC

    ch.onDisconnect(_ => {
      delete state[id]
      io.emit('leave', id, { reliable: true })
    })

    state[id] = {
      hue: Math.random() * 360 | 0,
      pos: [0, 5, 0],
      rot: 0,
    }
    ch.emit('spawn', { id, state }, { reliable: true })

    for (let e of ['hue', 'pos', 'rot']) {
      ch.on(e, data => {
        state[id][e] = data
      })
    }

    idC++
    idC %= 65535
  })

  return io
}