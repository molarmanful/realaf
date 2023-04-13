import fs from 'fs/promises'
import { compileFile } from 'pug'
import { render } from 'stylus'
import postcss from 'postcss'
import autoprefixer from 'autoprefixer'

let css = x => {
  let I = `src/${x}.styl`
  let O = `dist/${x}.css`
  fs.readFile(I).then(styl => {
    render(styl + '', (err, css) => {
      postcss([autoprefixer]).process(css, { from: void 0 }).then(res => {
        fs.writeFile(O, res.css).then(_ => {
          console.log(I + ' > ' + O)
        })
      })
    })
  })
}

let html = x => {
  let I = `src/${x}.pug`
  let O = `dist/${x}.html`
  fs.writeFile(O, compileFile(I, {})()).then(_ => {
    console.log(I + ' > ' + O)
  })
}

fs.rm('dist', { recursive: true, force: true }).then(_ => {
  fs.mkdir('dist').then(_ => {
    css('style')
    html('index')
  })
})