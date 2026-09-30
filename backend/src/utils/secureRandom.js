const crypto = require('crypto')

/**
 * Cryptographically secure random helpers.
 *
 * Why this module exists: the password-reset OTPs were generated with
 * `Math.random()`, whose output is predictable from a few observed values.
 * An attacker who could trigger two resets could forecast the next OTP and take
 * over any account. `crypto.randomInt` is CSPRNG-backed and unbiased.
 */

/** Numeric OTP of `length` digits, always zero-padded (default 6 digits). */
const generateOtp = (length = 6) => {
  const max = 10 ** length
  return crypto.randomInt(0, max).toString().padStart(length, '0')
}

/** URL/filename-safe random token. */
const randomToken = (bytes = 16) => crypto.randomBytes(bytes).toString('hex')

/** Human-readable identifier such as `CR-841902`. */
const randomStudentId = (prefix = 'CR') => `${prefix}${crypto.randomInt(100000, 1000000)}`

/** Collision-resistant suffix for stored filenames: `<timestamp>-<random hex>`. */
const uniqueFileSuffix = () => `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`

module.exports = { generateOtp, randomToken, randomStudentId, uniqueFileSuffix }
