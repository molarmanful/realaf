import '@unocss/reset/normalize.css'
import 'uno.css'
import './style.css'
import App from './App.svelte'

let app = new App({
  target: document.getElementById('app'),
})

export default app
