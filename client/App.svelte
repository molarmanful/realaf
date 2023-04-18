<script>
  import { onMount } from 'svelte'
  import { SCENE } from './scenes/x0'
  import geckos from '@geckos.io/client'

  let bcan
  let fps = 0
  window.ch = geckos({
    // url: `${location.protocol}//${
    //   import.meta.env.VITE_UDP_HOST || location.hostname
    // }`,
    url: `${location.protocol}//${location.host}`,
    port: null,
  })

  onMount(_ => {
    ch.onConnect(err => {
      if (err) {
        console.error(err.message)
        return
      }

      let S = new SCENE(bcan, ch)
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
