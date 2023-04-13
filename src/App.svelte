<script>
  import { onMount } from 'svelte'
  import { createScene } from './scenes/x0'

  let bcan
  let fps = 0

  onMount(_ => {
    createScene(bcan, ({ engine, scene }) => {
      scene.registerAfterRender(_ => {
        fps = engine.getFps() | 0
      })
    })
  })
</script>

<section flex justify-center items-center>
  <span fixed top-0 right-0 text-white>{fps}fps</span>
  <canvas bind:this={bcan} w-screen h-screen outline-0 />
</section>
