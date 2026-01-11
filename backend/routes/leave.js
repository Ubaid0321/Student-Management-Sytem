const express = require('express');
const { v4: uuidv4 } = require('uuid');

module.exports = (db) => {
  const router = express.Router();

  // Initialize leave applications array
  if (!db.leaveApplications) db.leaveApplications = [];

  // Get all leave applications (admin/teacher)
  router.get('/', (req, res) => {
    const { status, studentId, startDate, endDate } = req.query;
    let applications = [...db.leaveApplications];

    if (status) applications = applications.filter(a => a.status === status);
    if (studentId) applications = applications.filter(a => a.studentId === studentId);
    if (startDate) applications = applications.filter(a => a.startDate >= startDate);
    if (endDate) applications = applications.filter(a => a.endDate <= endDate);

    // Enrich with student details
    const enriched = applications.map(a => {
      const student = db.students.find(s => s.id === a.studentId);
      const approver = db.users.find(u => u.id === a.approvedBy);
      
      return {
        ...a,
        studentName: student?.name || 'Unknown',
        rollNumber: student?.rollNumber || '',
        semester: student?.semester,
        approverName: approver?.name || null
      };
    });

    res.json(enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  });

  // Get leave application by ID
  router.get('/:id', (req, res) => {
    const application = db.leaveApplications.find(a => a.id === req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Leave application not found' });
    }

    const student = db.students.find(s => s.id === application.studentId);
    const approver = db.users.find(u => u.id === application.approvedBy);

    res.json({
      ...application,
      studentName: student?.name,
      rollNumber: student?.rollNumber,
      approverName: approver?.name
    });
  });

  // Submit leave application (student)
  router.post('/', (req, res) => {
    const { studentId, startDate, endDate, reason, leaveType, attachments } = req.body;

    if (!studentId || !startDate || !endDate || !reason || !leaveType) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Calculate number of days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const application = {
      id: uuidv4(),
      studentId,
      startDate,
      endDate,
      days,
      reason,
      leaveType, // sick, casual, emergency, academic
      attachments: attachments || [],
      status: 'pending', // pending, approved, rejected
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
      createdAt: new Date().toISOString()
    };

    db.leaveApplications.push(application);

    // Notify admin
    const admins = db.users.filter(u => u.role === 'admin');
    admins.forEach(admin => {
      db.notifications.push({
        id: uuidv4(),
        userId: admin.id,
        title: 'New Leave Application',
        message: `${db.students.find(s => s.id === studentId)?.name} has applied for ${leaveType} leave`,
        type: 'leave',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully',
      application
    });
  });

  // Approve/Reject leave (admin/teacher)
  router.put('/:id/status', (req, res) => {
    const index = db.leaveApplications.findIndex(a => a.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Leave application not found' });
    }

    const { status, approvedBy, rejectionReason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    db.leaveApplications[index] = {
      ...db.leaveApplications[index],
      status,
      approvedBy,
      approvedAt: new Date().toISOString(),
      rejectionReason: status === 'rejected' ? rejectionReason : null
    };

    // Mark attendance as leave if approved
    if (status === 'approved') {
      const application = db.leaveApplications[index];
      const start = new Date(application.startDate);
      const end = new Date(application.endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const existingIndex = db.attendance.findIndex(
          a => a.studentId === application.studentId && a.date === dateStr
        );

        if (existingIndex >= 0) {
          db.attendance[existingIndex].status = 'leave';
        } else {
          db.attendance.push({
            id: uuidv4(),
            studentId: application.studentId,
            date: dateStr,
            status: 'leave',
            markedAt: new Date().toISOString()
          });
        }
      }
    }

    // Notify student
    db.notifications.push({
      id: uuidv4(),
      userId: db.leaveApplications[index].studentId,
      title: `Leave ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: status === 'approved' 
        ? 'Your leave application has been approved' 
        : `Your leave application was rejected: ${rejectionReason || 'No reason provided'}`,
      type: 'leave',
      isRead: false,
      createdAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Leave application ${status}`,
      application: db.leaveApplications[index]
    });
  });

  // Get student's leave history
  router.get('/student/:studentId', (req, res) => {
    const applications = db.leaveApplications
      .filter(a => a.studentId === req.params.studentId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const summary = {
      total: applications.length,
      approved: applications.filter(a => a.status === 'approved').length,
      rejected: applications.filter(a => a.status === 'rejected').length,
      pending: applications.filter(a => a.status === 'pending').length,
      totalDaysApproved: applications
        .filter(a => a.status === 'approved')
        .reduce((sum, a) => sum + a.days, 0)
    };

    res.json({ applications, summary });
  });

  // Delete leave application (only pending)
  router.delete('/:id', (req, res) => {
    const index = db.leaveApplications.findIndex(a => a.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Leave application not found' });
    }

    if (db.leaveApplications[index].status !== 'pending') {
      return res.status(400).json({ error: 'Can only delete pending applications' });
    }

    db.leaveApplications.splice(index, 1);
    res.json({ success: true, message: 'Leave application deleted' });
  });

  // Get leave statistics
  router.get('/stats/overview', (req, res) => {
    const applications = db.leaveApplications;
    
    const leaveByType = {
      sick: applications.filter(a => a.leaveType === 'sick' && a.status === 'approved').length,
      casual: applications.filter(a => a.leaveType === 'casual' && a.status === 'approved').length,
      emergency: applications.filter(a => a.leaveType === 'emergency' && a.status === 'approved').length,
      academic: applications.filter(a => a.leaveType === 'academic' && a.status === 'approved').length
    };

    const monthlyStats = {};
    applications.forEach(a => {
      const month = a.startDate.substring(0, 7);
      if (!monthlyStats[month]) {
        monthlyStats[month] = { approved: 0, rejected: 0, pending: 0 };
      }
      monthlyStats[month][a.status]++;
    });

    res.json({
      total: applications.length,
      pending: applications.filter(a => a.status === 'pending').length,
      approved: applications.filter(a => a.status === 'approved').length,
      rejected: applications.filter(a => a.status === 'rejected').length,
      leaveByType,
      monthlyStats
    });
  });

  return router;
};

