<script setup>
  import TitleScreen from './TitleScreen.svelte'

  export let fade
  export let loaded
  $: attrs = {
    bg: 'purple-8/80',
  }
</script>

<TitleScreen {attrs} {fade} {loaded} on:click>
  <h1 text="center head">REALAF</h1>
  <br />
  <p>WASD &nbsp;=> MOVE</p>
  <p>MOUSE => LOOK</p>
  <p>SHIFT => SPRINT</p>
  <p>SPACE => JUMP/BOUNCE</p>
  <br />
  <p text-center animate-pulse>
    [{loaded ? 'CLICK TO START' : 'LOADING...'}]
  </p>
</TitleScreen>

<div hidden bg="purple-8/80" />
