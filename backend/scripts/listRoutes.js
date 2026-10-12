/**
 * Walks the mounted Express app and prints every registered route.
 * Used to diff the frontend's API calls against what the backend actually serves.
 */
const fs = require('fs')
const path = require('path')

const app = require(path.join(__dirname, '..', 'src', 'server.js'))

const routes = []

const walk = (stack, prefix) => {
  for (const layer of stack) {
    if (layer.route) {
      const routePath = (prefix + layer.route.path).replace(/\/{2,}/g, '/')
      for (const method of Object.keys(layer.route.methods)) {
        routes.push(`${method.toUpperCase()} ${routePath}`)
      }
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      // Recover the mount path from the layer's regexp
      const src = layer.regexp.source
      let mount = src
        .replace(/^\^/, '')
        .replace(/\\\/\?\(\?=\\\/\|\$\)$/, '')
        .replace(/\\\/\?\(\?=\\\/\|\$\)/, '')
        .replace(/\\\//g, '/')
        .replace(/\(\?=\/\|\$\)/g, '')
        .replace(/\/\?\(\?=\/\|\$\)/g, '')
        .replace(/\?$/, '')
        .replace(/\/$/, '')
      if (mount === '' || mount === '(?:/)?') mount = ''
      walk(layer.handle.stack, prefix + mount)
    }
  }
}

walk(app._router.stack, '')

routes.sort()
fs.writeFileSync('/tmp/backend_routes.txt', routes.join('\n'))
console.log(`registered routes: ${routes.length}`)
