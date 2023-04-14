self.onmessage = ({ data }) => {
  let d = 1000 / data
  let prev = performance.now()

  while (1) {
    let now = performance.now()
    if (now > prev + d) {
      prev = now
      self.postMessage(now)
    }
  }
}