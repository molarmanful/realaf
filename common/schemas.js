import { BufferSchema, Model } from '@geckos.io/typed-array-buffer-schema'
import { uint16, int16, float32, uint64, string8 } from '@geckos.io/typed-array-buffer-schema'

let player = BufferSchema.schema('player', {
  id: uint16,
  hue: uint16,
  x: { type: int16, digits: 2 },
  y: { type: int16, digits: 2 },
  z: { type: int16, digits: 2 },
  rot: float32,
})

let snap = BufferSchema.schema('snap', {
  id: { type: string8, length: 6 },
  time: uint64,
  state: [player],
})

export let snapModel = new Model(snap)