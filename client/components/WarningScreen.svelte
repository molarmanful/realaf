<script>
  import TitleScreen from './TitleScreen.svelte'

  export let fade
  export let loaded
</script>

<TitleScreen {fade} {loaded} on:click>
  <h1 text="center head">WARNING</h1>
  <br />
  <p>MAY CONTAIN POTENTIALLY DISORIENTING FIRST-PERSON MOTION.</p>
  <p>BEST EXPERIENCED WITH A KEYBOARD AND MOUSE.</p>
  <p>(MAY ALSO REQUIRE A BEEFY GPU.)</p>
  <br />
  <p text-center animate-pulse>
    [{loaded ? 'CLICK TO CONTINUE' : 'LOADING...'}]
  </p>
</TitleScreen>
