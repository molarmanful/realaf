import { svelte } from '@sveltejs/vite-plugin-svelte'
import unocss from 'unocss/vite'
import { presetAttributify, presetUno, extractorSvelte } from 'unocss'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// https://vitejs.dev/config/
export default {
  root: join(dirname(fileURLToPath(new URL(import.meta.url))), 'client'),
  plugins: [
    unocss({
      presets: [presetAttributify(), presetUno()],
      extractors: extractorSvelte,
    }),
    svelte(),
  ],
  assetsInclude: 'src/scenes/assets/**',
}
