const express = require('express')
const mongoose = require('mongoose')
const router = express.Router()
const Teacher = require('../models/Teacher')
const Complaint = require('../models/Complaint')
const { inMemoryStore } = require('../utils/inMemoryStore')

const isDbConnected = () => mongoose.connection.readyState === 1

/**
 * Average resolution time (hours) for a set of resolved complaints.
 * Falls back to `updatedAt` when a complaint has no explicit resolution date.
 */
const avgResolutionHours = (complaints) => {
  if (!complaints.length) return 0

  const totalMs = complaints.reduce((acc, complaint) => {
    const created = new Date(complaint.createdAt || 0).getTime()
    const resolved = new Date(complaint.resolutionDate || complaint.updatedAt || 0).getTime()
    if (!created || !resolved || resolved < created) return acc
    return acc + (resolved - created)
  }, 0)

  return totalMs / complaints.length / (1000 * 60 * 60)
}

/**
 * Simple rating: faster resolution + higher volume = better rating.
 */
const ratingFor = (resolvedCount, hours) => {
  if (!resolvedCount) return 0
  if (hours < 24) return 5
  if (hours < 48) return 4
  if (hours < 72) return 3
  return 2
}

const buildPerformance = (teachers, resolvedComplaints) =>
  teachers.map((teacher) => {
    const mine = resolvedComplaints.filter(
      (complaint) => complaint.assignedTeacherId === teacher.teacherId
    )
    const hours = avgResolutionHours(mine)

    return {
      teacherId: teacher.teacherId,
      name: teacher.name,
      department: teacher.department,
      totalAssigned: (teacher.activeComplaints || 0) + (teacher.resolvedComplaints || 0),
      resolved: teacher.resolvedComplaints || 0,
      active: teacher.activeComplaints || 0,
      avgResolutionTime: hours.toFixed(1),
      rating: ratingFor(mine.length, hours)
    }
  })

router.get('/performance', async (_req, res) => {
  try {
    // Works with MongoDB when connected, and with the in-memory store when the
    // backend runs in offline/demo mode (no MONGO_URI) — this endpoint used to
    // throw a 500 in offline mode.
    const teachers = isDbConnected()
      ? await Teacher.find({}).lean()
      : inMemoryStore.getTeachers()

    const resolvedComplaints = isDbConnected()
      ? await Complaint.find({ status: 'Resolved' })
          .select('assignedTeacherId createdAt resolutionDate updatedAt')
          .lean()
      : inMemoryStore.getComplaints({ status: 'Resolved' })

    res.json(buildPerformance(teachers, resolvedComplaints))
  } catch (error) {
    console.error('Teacher performance fetch failed:', error)
    res.status(500).json({ message: 'Error fetching performance data' })
  }
})

module.exports = router
