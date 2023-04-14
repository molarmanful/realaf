import { parentPort } from 'node:worker_threads'

parentPort.on('message', d => {
  d = 1000 / d
  let prev = performance.now()

  while (1) {
    let now = performance.now()
    if (now > prev + d) {
      prev = now
      parentPort.postMessage(now)
    }
  }
})