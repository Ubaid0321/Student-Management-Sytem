const express = require('express');
const { v4: uuidv4 } = require('uuid');

module.exports = (db) => {
  const router = express.Router();

  // Store active QR sessions
  if (!db.qrSessions) db.qrSessions = [];

  // Generate QR code for attendance (teacher)
  router.post('/generate', (req, res) => {
    const { teacherId, subjectId, classId, validMinutes } = req.body;

    if (!teacherId || !subjectId) {
      return res.status(400).json({ error: 'Teacher ID and Subject ID are required' });
    }

    // Invalidate any existing session for this teacher/subject
    db.qrSessions = db.qrSessions.filter(
      s => !(s.teacherId === teacherId && s.subjectId === subjectId && s.isActive)
    );

    const validDuration = validMinutes || 15; // Default 15 minutes
    const expiresAt = new Date(Date.now() + validDuration * 60 * 1000);

    const session = {
      id: uuidv4(),
      code: generateAttendanceCode(),
      teacherId,
      subjectId,
      classId: classId || null,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      validMinutes: validDuration,
      isActive: true,
      scannedBy: []
    };

    db.qrSessions.push(session);

    const subject = db.subjects.find(s => s.id === subjectId);
    const teacher = db.teachers.find(t => t.id === teacherId);

    res.json({
      success: true,
      message: 'QR code generated successfully',
      session: {
        ...session,
        subjectName: subject?.name,
        teacherName: teacher?.name,
        qrData: JSON.stringify({
          code: session.code,
          sessionId: session.id,
          subject: subject?.code,
          date: session.date
        })
      }
    });
  });

  // Scan QR code to mark attendance (student)
  router.post('/scan', (req, res) => {
    const { studentId, code, sessionId, location } = req.body;

    if (!studentId || (!code && !sessionId)) {
      return res.status(400).json({ error: 'Student ID and QR code/session are required' });
    }

    // Find active session
    let session;
    if (sessionId) {
      session = db.qrSessions.find(s => s.id === sessionId && s.isActive);
    } else {
      session = db.qrSessions.find(s => s.code === code && s.isActive);
    }

    if (!session) {
      return res.status(404).json({ error: 'Invalid or expired QR code' });
    }

    // Check if expired
    if (new Date() > new Date(session.expiresAt)) {
      session.isActive = false;
      return res.status(400).json({ error: 'QR code has expired' });
    }

    // Check if already scanned
    if (session.scannedBy.includes(studentId)) {
      return res.status(400).json({ error: 'You have already marked your attendance' });
    }

    // Validate student exists
    const student = db.students.find(s => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Mark attendance
    const attendanceRecord = {
      id: uuidv4(),
      studentId,
      date: session.date,
      status: 'present',
      checkInTime: new Date().toLocaleTimeString('en-US', { hour12: false }),
      markedBy: 'qr-system',
      sessionId: session.id,
      subjectId: session.subjectId,
      location: location || null,
      markedAt: new Date().toISOString()
    };

    // Check if attendance already exists for this date
    const existingIndex = db.attendance.findIndex(
      a => a.studentId === studentId && a.date === session.date
    );

    if (existingIndex >= 0) {
      db.attendance[existingIndex] = {
        ...db.attendance[existingIndex],
        ...attendanceRecord
      };
    } else {
      db.attendance.push(attendanceRecord);
    }

    // Add to scanned list
    session.scannedBy.push(studentId);

    const subject = db.subjects.find(s => s.id === session.subjectId);

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      attendance: {
        ...attendanceRecord,
        studentName: student.name,
        rollNumber: student.rollNumber,
        subjectName: subject?.name
      }
    });
  });

  // Get active session status (teacher)
  router.get('/session/:sessionId', (req, res) => {
    const session = db.qrSessions.find(s => s.id === req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const subject = db.subjects.find(s => s.id === session.subjectId);
    const scannedStudents = session.scannedBy.map(studentId => {
      const student = db.students.find(s => s.id === studentId);
      return {
        id: studentId,
        name: student?.name,
        rollNumber: student?.rollNumber
      };
    });

    const isExpired = new Date() > new Date(session.expiresAt);
    const remainingTime = isExpired ? 0 : Math.ceil((new Date(session.expiresAt) - new Date()) / 1000);

    res.json({
      ...session,
      subjectName: subject?.name,
      scannedStudents,
      scannedCount: session.scannedBy.length,
      totalStudents: db.students.length,
      isExpired,
      remainingSeconds: remainingTime
    });
  });

  // End session early (teacher)
  router.put('/session/:sessionId/end', (req, res) => {
    const session = db.qrSessions.find(s => s.id === req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.isActive = false;
    session.endedAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Session ended',
      totalScanned: session.scannedBy.length
    });
  });

  // Extend session time (teacher)
  router.put('/session/:sessionId/extend', (req, res) => {
    const { additionalMinutes } = req.body;
    const session = db.qrSessions.find(s => s.id === req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const currentExpiry = new Date(session.expiresAt);
    const newExpiry = new Date(currentExpiry.getTime() + (additionalMinutes || 10) * 60 * 1000);
    
    session.expiresAt = newExpiry.toISOString();
    session.isActive = true;

    res.json({
      success: true,
      message: `Session extended by ${additionalMinutes || 10} minutes`,
      newExpiresAt: session.expiresAt
    });
  });

  // Get today's QR sessions (teacher)
  router.get('/teacher/:teacherId/today', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const sessions = db.qrSessions
      .filter(s => s.teacherId === req.params.teacherId && s.date === today)
      .map(session => {
        const subject = db.subjects.find(s => s.id === session.subjectId);
        return {
          ...session,
          subjectName: subject?.name,
          scannedCount: session.scannedBy.length,
          isExpired: new Date() > new Date(session.expiresAt)
        };
      });

    res.json(sessions);
  });

  // Helper function to generate unique attendance code
  function generateAttendanceCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  return router;
};

