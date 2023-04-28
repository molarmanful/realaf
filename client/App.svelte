<script>
  import { onMount } from 'svelte'
  import { SCENE } from './scenes/x0'
  import geckos from '@geckos.io/client'

  let bcan
  let fps = 0
  let ch = geckos({
    url: `${location.protocol}//${location.host}${
      import.meta.env.PROD ? ':3000' : ''
    }`,
    port: null,
  })

  onMount(_ => {
    ch.onConnect(async err => {
      if (err) {
        console.error(err.message)
        return
      }
      console.log('connected')

      let S = await SCENE.build(bcan, ch)
      S.scene.registerAfterRender(_ => {
        fps = S.engine.getFps() | 0
      })
    })
  })
</script>

<section flex justify-center items-center>
  <span fixed top-0 right-0 text-white>{fps}fps</span>
  <canvas bind:this={bcan} w-screen h-screen outline-0 />
</section>
