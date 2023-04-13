import { svelte } from '@sveltejs/vite-plugin-svelte'
import unocss from 'unocss/vite'
import { presetAttributify, presetUno, extractorSvelte } from 'unocss'

// https://vitejs.dev/config/
export default {
  plugins: [
    unocss({
      presets: [presetAttributify(), presetUno()],
      extractors: extractorSvelte,
    }),
    svelte(),
  ],
  base: '/bab-test-template/',
  assetsInclude: 'src/scenes/assets/**',
}
