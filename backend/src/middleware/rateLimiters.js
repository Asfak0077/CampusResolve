const rateLimit = require('express-rate-limit')

/**
 * Rate limiters for the endpoints that are actually worth protecting:
 * credential guessing, paid AI calls, and file uploads.
 *
 * Note: the default store is in-memory, so limits are per server instance.
 * That is fine for a single Vercel/Express instance; swap in a Redis store if
 * the API is ever scaled horizontally.
 */

const jsonLimitResponse = (message) => ({
  statusCode: 429,
  message: 'Too many requests. Please wait a moment and try again.',
  ...(message ? { detail: message } : {})
})

/** Sign-in / OTP / password-reset endpoints — brute-force protection. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only failures count towards the limit
  message: jsonLimitResponse('Too many sign-in or password-reset attempts.')
})

/** Public AI endpoints — protects paid model credits from abuse. */
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonLimitResponse('Too many AI requests. Please slow down.')
})

/** Multipart uploads — protects disk and bandwidth. */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonLimitResponse('Too many uploads. Please try again later.')
})

/**
 * Baseline limiter for every API route group — blunt but effective protection
 * for handlers that read/write the database. Generous enough that normal
 * dashboard usage (a few hundred requests per session) is unaffected.
 */
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonLimitResponse('Too many requests. Please slow down.')
})

/** Generic write limiter for public form-style endpoints. */
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonLimitResponse('Too many submissions. Please try again later.')
})

module.exports = { apiLimiter, authLimiter, aiLimiter, uploadLimiter, writeLimiter }
