import geckos, { iceServers } from '@geckos.io/server'
import { Worker } from 'node:worker_threads'
import { SnapshotInterpolation } from '@geckos.io/snapshot-interpolation'
import { snapModel } from '../common/schemas.js'
import VARS from '../common/config.js'

export class NET {
  constructor(server) {
    this.SI = new SnapshotInterpolation()
    this.state = {}
    this.idC = 0
    this.pop = 0

    this.IO(server)
  }

  IO(server) {
    let io = geckos({
      bindAddress: process.env.UDP_HOST,
      iceServers: process.env.NODE_ENV == 'production' ? iceServers : [],
    })
    io.addServer(server)

    this.tickLoop(({ now, t }) => {
      if (t % VARS.tickDiv == 0) {
        this.sendState()
      }
    })

    io.onConnection(ch => {
      ch.on('hello', _ => {
        this.pop++
        let id = this.idC
        this.state[id] = {
          hue: Math.random() * 360 | 0,
          pos: [0, VARS.spawnY, 0],
          rot: 0,
        }

        ch.emit('spawn', { id, data: this.state[id] }, { reliable: true })
        this.sendState()

        ch.on('data', data => {
          this.state[id] = data
        })

        ch.onDisconnect(_ => {
          this.pop--
          if (this.pop <= 0) {
            this.idC = 0
            this.pop = 0
          }

          delete this.state[id]
          io.emit('leave', id, { reliable: true })
        })

        this.idC++
        this.idC %= 65535
      })
    })

    this.io = io
  }

  tickLoop(f, t = VARS.sTicks) {
    let tick = new Worker(new URL('tick.js', import.meta.url))
    tick.postMessage(t)
    tick.on('message', f)
  }

  sendState() {
    let snap = this.SI.snapshot.create(this.preSnap())
    this.SI.vault.add(snap)
    this.io.raw.emit(snapModel.toBuffer(snap))
  }

  preSnap() {
    return Object.entries(this.state).map(([id, { hue, pos, rot }]) => ({
      id,
      hue,
      x: pos[0], y: pos[1], z: pos[2],
      rot,
    }))
  }
}