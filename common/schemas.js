import { BufferSchema, Model } from '@geckos.io/typed-array-buffer-schema'
import { uint8, int16, uint64, string8 } from '@geckos.io/typed-array-buffer-schema'

let player = BufferSchema.schema('player', {
  id: { type: string8, length: 24 },
  hue: uint8,
  x: { type: int16, digits: 2 },
  y: { type: int16, digits: 2 },
  z: { type: int16, digits: 2 },
  qx: { type: int16, digits: 2 },
  qy: { type: int16, digits: 2 },
  qz: { type: int16, digits: 2 },
  qw: { type: int16, digits: 2 },
})

let snap = BufferSchema.schema('snap', {
  id: { type: string8, length: 6 },
  time: uint64,
  state: [player]
})

export let snapModel = new Model(snap)