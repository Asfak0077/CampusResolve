const mongoose = require('mongoose');
const ActivityLog = require('../models/ActivityLog');

/**
 * Logs an activity to the database
 * @param {string} complaintId - The ID of the complaint
 * @param {string} action - The action performed (created, assigned, reassigned, status_changed, escalated, deleted, feedback_submitted)
 * @param {object} performedBy - Details of the user who performed the action { userId, name, role }
 * @param {object} details - Any additional details for the log
 * @param {string} notes - Optional notes
 */
const logActivity = async (complaintId, action, performedBy, details = {}, notes = '') => {
  try {
    // Offline / demo mode: complaint ids are in-memory keys, not ObjectIds, so a
    // Mongo write would fail validation. The admin activity feed is derived from
    // the in-memory complaint timelines, and every offline route already appends
    // to them, so there is nothing to write here.
    if (mongoose.connection.readyState !== 1) {
      return null;
    }

    const log = new ActivityLog({
      complaintId,
      action,
      performedBy,
      details,
      notes
    });
    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to log activity:', error.message);
    // Don't throw error to avoid breaking the main flow
    return null;
  }
};

module.exports = { logActivity };
