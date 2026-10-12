/**
 * Local harness for the Vercel serverless entry (api/index.js).
 *
 * Serves the exported handler over a real HTTP port so the production routing
 * behaviour can be exercised before deploying. Run:
 *   node api/serve-local.js
 * Then hit http://localhost:5100/api/health
 */
const http = require('http')
const handler = require('./index.js')

const port = Number(process.env.PORT || 5100)

const server = http.createServer((req, res) => {
  Promise.resolve(handler(req, res)).catch((err) => {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ message: 'harness error', error: err.message }))
  })
})

server.listen(port, '0.0.0.0', () => {
  console.log(`serverless harness listening on http://localhost:${port}`)
})
