<script>
  export let cl = ''
  export let attrs = {}
  export let fade = true
  export let loaded = false
</script>

<section
  fl-center
  fixed
  hw-screen
  top-0
  left-0
  bg-blue
  text-white
  ofade-500
  on:click
  {fade}
  cursor={loaded ? 'pointer' : 'default'}
  class={cl}
  {...attrs}
>
  <div max-w="50%">
    <slot />
  </div>
</section>
