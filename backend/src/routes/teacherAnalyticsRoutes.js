const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Teacher = require('../models/Teacher');
const Complaint = require('../models/Complaint');
const { inMemoryStore } = require('../utils/inMemoryStore');

/**
 * Offline/demo mode: build the same performance payload from the persistent
 * in-memory store so dashboards render when MongoDB is unreachable.
 */
const buildInMemoryPerformance = () => {
  const complaints = inMemoryStore.getComplaints();

  return inMemoryStore.getTeachers().map((teacher) => {
    const teacherKey = teacher.teacherId || teacher.id;
    const assigned = complaints.filter((c) => c.assignedTeacherId === teacherKey);
    const resolved = assigned.filter((c) => c.status === 'Resolved' || c.status === 'Closed');
    const active = assigned.filter((c) => c.status !== 'Resolved' && c.status !== 'Closed');

    let avgResolutionTime = 0;
    if (resolved.length > 0) {
      const totalDuration = resolved.reduce((acc, curr) => {
        const created = new Date(curr.createdAt).getTime();
        const resolvedAt = new Date(curr.resolutionDate || curr.updatedAt).getTime();
        return acc + Math.max(0, resolvedAt - created);
      }, 0);
      avgResolutionTime = totalDuration / resolved.length / (1000 * 60 * 60); // hours
    }

    let rating = 0;
    if (resolved.length > 0) {
      if (avgResolutionTime < 24) rating = 5;
      else if (avgResolutionTime < 48) rating = 4;
      else if (avgResolutionTime < 72) rating = 3;
      else rating = 2;
    }

    return {
      teacherId: teacherKey,
      name: teacher.name,
      department: teacher.department,
      totalAssigned: assigned.length,
      resolved: resolved.length,
      active: active.length,
      avgResolutionTime: avgResolutionTime.toFixed(1),
      rating
    };
  });
};

router.get('/performance', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json(buildInMemoryPerformance());
    }

    const teachers = await Teacher.find({});
    
    const performanceData = await Promise.all(teachers.map(async (teacher) => {
      const resolvedComplaints = await Complaint.find({
        assignedTeacherId: teacher.teacherId,
        status: 'Resolved'
      });

      let avgResolutionTime = 0;
      if (resolvedComplaints.length > 0) {
        const totalDuration = resolvedComplaints.reduce((acc, curr) => {
          const created = new Date(curr.createdAt);
          const resolved = new Date(curr.resolutionDate || curr.updatedAt);
          return acc + (resolved - created);
        }, 0);
        avgResolutionTime = (totalDuration / resolvedComplaints.length) / (1000 * 60 * 60); // In hours
      }

      // Simple rating logic: 
      // Faster resolution + higher volume = better rating
      let rating = 0;
      if (resolvedComplaints.length > 0) {
        if (avgResolutionTime < 24) rating = 5;
        else if (avgResolutionTime < 48) rating = 4;
        else if (avgResolutionTime < 72) rating = 3;
        else rating = 2;
      }

      return {
        teacherId: teacher.teacherId,
        name: teacher.name,
        department: teacher.department,
        totalAssigned: (teacher.activeComplaints || 0) + (teacher.resolvedComplaints || 0),
        resolved: teacher.resolvedComplaints || 0,
        active: teacher.activeComplaints || 0,
        avgResolutionTime: avgResolutionTime.toFixed(1),
        rating
      };
    }));

    res.json(performanceData);
  } catch (error) {
    console.error('Teacher performance fetch failed:', error);
    res.status(500).json({ message: 'Error fetching performance data' });
  }
});

module.exports = router;
