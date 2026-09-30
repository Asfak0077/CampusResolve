/**
 * Single source of truth for API route mounting.
 *
 * Both entry points use this module:
 *   • backend/src/server.js  — long-running Express server (local dev, Render, PM2)
 *   • api/index.js           — Vercel serverless function (production on Vercel)
 *
 * Keeping the mount table in one place prevents the two entry points from
 * drifting apart. (They previously did: `/api/analytics/teachers/performance`
 * existed on the server but 404'd on the serverless deployment.)
 */

const analyticsTeachers = require('./teacherAnalyticsRoutes')

const mountRoutes = (app) => {
  app.use('/api/auth', require('./authRoutesEnhanced'))
  app.use('/api/profile', require('./profileRoutes'))
  app.use('/api/users/profile', require('./profileRoutes'))
  app.use('/api/users', require('./profileRoutes'))
  app.use('/api/complaints', require('./complaintRoutesEnhanced'))
  app.use('/api/teachers', require('./teacherRoutes'))
  app.use('/api/notifications', require('./notificationRoutes'))
  app.use('/api/upload', require('./uploadRoutes'))

  // Teacher performance analytics.
  // Canonical path (used by the frontend): /api/analytics/teachers/performance
  app.use('/api/analytics/teachers', analyticsTeachers)
  // Backwards-compatible alias for older clients.
  app.use('/api/analytics', analyticsTeachers)

  app.use('/api/feedback', require('./feedbackRoutes'))
  app.use('/api/chatbot', require('./chatbotRoutes'))
  app.use('/api/ai-intelligence', require('./aiIntelligenceRoutes'))

  return app
}

module.exports = { mountRoutes }
