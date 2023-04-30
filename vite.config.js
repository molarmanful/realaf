import { svelte } from '@sveltejs/vite-plugin-svelte'
import unocss from 'unocss/vite'
import { presetAttributify, presetWebFonts, presetUno } from 'unocss'
import extractorSvelte from '@unocss/extractor-svelte'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// https://vitejs.dev/config/
export default {
  root: join(dirname(fileURLToPath(new URL(import.meta.url))), 'client'),
  plugins: [
    unocss({
      presets: [
        presetAttributify(),
        presetUno(),
        presetWebFonts({
          provider: 'google',
          fonts: {
            mono: 'IBM Plex Mono:200,800',
          },
        }),
      ],
      shortcuts: [
        {
          'fl-center': 'flex justify-center items-center',
          'hw-screen': 'h-screen w-screen',
          'text-body': 'font-mono',
          'text-head': 'font-bold',
          'fade-true': 'opacity-100 pointer-events-auto',
          'fade-false': 'opacity-0 pointer-events-none',
        },
        [/^ofade-([\d]*)$/, ([, c]) => `transition-opacity duration-${c}`],
      ],
      extractors: [extractorSvelte()],
    }),
    svelte(),
  ],
  assetsInclude: ['client/scenes/assets/**'],
}
