/**
 * Shared 404 + error handling for the API, used by both entry points so the
 * Express server and the Vercel function behave identically.
 */

/** JSON 404 for unmatched API routes (instead of Express's HTML error page). */
const apiNotFound = (req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  res.status(404).json({
    message: 'Not found',
    path: req.originalUrl
  })
}

/**
 * Terminal error handler. Maps the errors clients can actually cause onto 4xx
 * codes with useful messages, and keeps everything else a generic 500 so
 * internal details never leak.
 */
const apiErrorHandler = (error, _req, res, _next) => {
  // Malformed JSON body
  if (error?.type === 'entity.parse.failed' || error instanceof SyntaxError) {
    return res.status(400).json({ message: 'Malformed JSON in request body' })
  }

  // Body larger than the configured limit
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request payload too large' })
  }

  // Rule violations raised by express-mongo-sanitize
  if (error?.message?.includes('Prohibited')) {
    return res.status(400).json({ message: 'Invalid characters in request' })
  }

  // Mongoose validation → 400 with the offending fields
  if (error?.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed',
      fields: Object.keys(error.errors || {})
    })
  }

  // Duplicate key (e.g. email already registered)
  if (error?.code === 11000) {
    return res.status(409).json({ message: 'That record already exists' })
  }

  // Invalid ObjectId in a URL
  if (error?.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid identifier' })
  }

  console.error('[api] Unhandled error:', error)
  return res.status(500).json({ message: 'Internal server error' })
}

/** Applies the 404 handler to API paths only, then the error handler. */
const registerApiErrorHandling = (app) => {
  app.use('/api', apiNotFound)
  app.use(apiErrorHandler)
  return app
}

module.exports = { apiNotFound, apiErrorHandler, registerApiErrorHandling }
