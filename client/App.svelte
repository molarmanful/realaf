<script>
  import { onMount } from 'svelte'
  import { SCENE } from './scenes/x0'
  import DirScreen from './components/DirScreen.svelte'
  import WarningScreen from './components/WarningScreen.svelte'
  import geckos from '@geckos.io/client'

  let bcan
  let fps = 0
  let state = 0
  let fade = false
  let ready0 = false
  let ready1 = false
  let flow0, flow1

  let ch = geckos({
    url: `${location.protocol}//${location.host}${
      import.meta.env.PROD ? ':3000' : ''
    }`,
    port: null,
  })

  onMount(_ => {
    fade = true

    ch.onConnect(async err => {
      if (err) {
        console.error(err.message)
        return
      }
      console.log('connected')

      let S = await SCENE.build(bcan, ch)

      flow0 = _ => {
        if (ready0) {
          S.init()
          state++
          ready1 = true
        }
      }

      flow1 = _ => {
        if (ready1) {
          S.engine.enterPointerlock()
          state++
        }
      }

      S.scene.executeWhenReady(_ => {
        ready0 = true
      })

      S.scene.registerAfterRender(_ => {
        fps = S.engine.getFps() | 0
      })
    })
  })
</script>

<main {fade} ofade-1000>
  <section fl-center>
    <span fixed top-0 right-0 text="white 50%">{fps}fps</span>
    <canvas bind:this={bcan} w-screen h-screen outline-0 />
  </section>
  <DirScreen on:click={_ => flow1()} loaded={ready1} fade={state < 2} />
  <WarningScreen on:click={_ => flow0()} loaded={ready0} fade={state < 1} />
</main>

<div hidden cursor="pointer default" fade="true false" />
