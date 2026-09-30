/**
 * Single source of truth for the JWT signing secret.
 *
 * Security rationale: this project previously fell back to the literal string
 * `'dev-secret'` whenever `SECRET_KEY` was missing. Because the source is public,
 * that fallback is effectively a published signing key — anyone could forge a
 * token with `role: 'admin'`. We now fail fast in production and warn loudly in
 * development instead of silently issuing forgeable tokens.
 */

const INSECURE_DEFAULT = 'dev-secret'

let hasWarned = false

const isProduction = () =>
  process.env.NODE_ENV === 'production' ||
  process.env.VERCEL_ENV === 'production' ||
  Boolean(process.env.VERCEL)

const getJwtSecret = () => {
  const secret = process.env.SECRET_KEY || process.env.JWT_SECRET

  if (secret && secret !== INSECURE_DEFAULT && secret.length >= 16) return secret

  if (isProduction()) {
    throw new Error(
      'SECRET_KEY is missing or too weak. Set a strong SECRET_KEY (or JWT_SECRET) in the host environment before deploying — refusing to sign or verify tokens with a public default.'
    )
  }

  if (!hasWarned) {
    hasWarned = true
    console.warn(
      '\n⚠️  SECRET_KEY is not set. Using an INSECURE development secret.\n' +
      '   Add SECRET_KEY=<random 32+ char string> to backend/.env\n' +
      '   (generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))")\n'
    )
  }

  return INSECURE_DEFAULT
}

module.exports = { getJwtSecret, INSECURE_DEFAULT }
