/**
 * CORS configuration.
 *
 * The API previously used a bare `cors()`, i.e. `Access-Control-Allow-Origin: *`
 * on every response — any website could call the API from a victim's browser.
 * We now echo only origins we recognise:
 *
 *   • FRONTEND_URL and anything in ALLOWED_ORIGINS (comma separated)
 *   • localhost / 127.0.0.1 on any port (development)
 *   • *.vercel.app (deployment + PR preview URLs)
 *   • requests with no Origin header (curl, server-to-server, same-origin)
 *
 * Set CORS_ALLOW_ALL=true only for a throwaway demo instance.
 */

const toList = (value) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim().replace(/\/$/, ''))
    .filter(Boolean)

const isLocalhost = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
const isVercelPreview = (origin) => /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.vercel\.app$/.test(origin)

const buildCorsOptions = () => {
  const allowlist = [...new Set([
    ...toList(process.env.FRONTEND_URL),
    ...toList(process.env.ALLOWED_ORIGINS)
  ].map((origin) => origin.replace(/\/$/, '')))]

  const allowAll = String(process.env.CORS_ALLOW_ALL || '').toLowerCase() === 'true'

  if (!allowlist.length && !allowAll) {
    console.warn(
      '⚠️  CORS: FRONTEND_URL is not set — only localhost and *.vercel.app origins are allowed. ' +
      'Set FRONTEND_URL (and ALLOWED_ORIGINS for extra hosts) in the deployment environment.'
    )
  }

  return {
    origin (origin, callback) {
      if (!origin) return callback(null, true)
      if (allowAll) return callback(null, true)
      if (allowlist.includes(origin)) return callback(null, true)

      const isDev = process.env.NODE_ENV !== 'production'
      if (isDev && isLocalhost(origin)) return callback(null, true)
      if (isVercelPreview(origin)) return callback(null, true)

      // Not allowed: continue without CORS headers so the browser blocks the
      // response. (Throwing here would turn a policy decision into a 500.)
      return callback(null, false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    maxAge: 86400
  }
}

module.exports = { buildCorsOptions }
