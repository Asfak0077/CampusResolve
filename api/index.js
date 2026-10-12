/**
 * Vercel serverless wrapper for the Express backend.
 *
 * This delegates to the SAME Express app the dev server uses
 * (backend/src/server.js exports `app`), so routes, middleware and
 * offline fallbacks can never drift between local and deployed environments.
 * Requiring server.js does NOT start a listener — it only listens when run
 * directly — so it is safe to reuse here.
 */

let app = null
let bootstrap = null

async function ensureReady() {
  if (!bootstrap) {
    bootstrap = (async () => {
      const { connectDatabase } = require('../backend/src/config/db')

      // Connect before serving. Without MONGO_URI this reports false and the
      // routes fall back to the in-memory store instead of throwing.
      const connected = await connectDatabase()

      // Seed demo data for whichever mode we ended up in.
      try {
        const { seedDemoData } = require('../backend/src/utils/seedDemoData')
        await seedDemoData()
      } catch (error) {
        console.warn('Seeding skipped:', error.message)
      }

      if (!connected) {
        console.warn(
          '⚠️ Running without MongoDB. Set MONGO_URI in the Vercel project to persist data; ' +
          'serverless invocations share no memory, so the demo store resets between requests.'
        )
      }

      app = require('../backend/src/server')
    })()
  }
  return bootstrap
}

module.exports = async (req, res) => {
  try {
    await ensureReady()
    return app(req, res)
  } catch (error) {
    console.error('Failed to initialize Express app:', error)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        message: 'Server initialization failed',
        error: error.message
      })
    )
  }
}
