const express = require('express');
const { v4: uuidv4 } = require('uuid');

module.exports = (db) => {
  const router = express.Router();

  // Get all attendance records (with optional filters)
  router.get('/', (req, res) => {
    let { date, studentId, startDate, endDate } = req.query;
    let records = [...db.attendance];

    if (studentId) {
      records = records.filter(r => r.studentId === studentId);
    }

    if (date) {
      records = records.filter(r => r.date === date);
    }

    if (startDate && endDate) {
      records = records.filter(r => r.date >= startDate && r.date <= endDate);
    }

    // Enrich with student details
    const enrichedRecords = records.map(record => {
      const student = db.students.find(s => s.id === record.studentId);
      return {
        ...record,
        studentName: student ? student.name : 'Unknown',
        studentRollNumber: student ? student.rollNumber : 'Unknown'
      };
    });

    res.json(enrichedRecords);
  });

  // Get attendance for a specific student
  router.get('/student/:studentId', (req, res) => {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    let records = db.attendance.filter(r => r.studentId === studentId);

    if (startDate && endDate) {
      records = records.filter(r => r.date >= startDate && r.date <= endDate);
    }

    // Calculate summary
    const totalDays = records.length;
    const presentDays = records.filter(r => r.status === 'present').length;
    const absentDays = records.filter(r => r.status === 'absent').length;
    const lateDays = records.filter(r => r.status === 'late').length;
    const percentage = totalDays > 0 ? ((presentDays + (lateDays * 0.5)) / totalDays * 100).toFixed(2) : 0;

    res.json({
      records: records.sort((a, b) => new Date(b.date) - new Date(a.date)),
      summary: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        percentage: parseFloat(percentage)
      }
    });
  });

  // Mark attendance (single or bulk)
  router.post('/', (req, res) => {
    const { date, attendanceRecords } = req.body;

    if (!date || !attendanceRecords || !Array.isArray(attendanceRecords)) {
      return res.status(400).json({ error: 'Date and attendance records are required' });
    }

    const results = [];
    const errors = [];

    attendanceRecords.forEach(record => {
      const { studentId, status } = record;

      // Validate student exists
      const student = db.students.find(s => s.id === studentId);
      if (!student) {
        errors.push({ studentId, error: 'Student not found' });
        return;
      }

      // Check if attendance already marked for this date
      const existingIndex = db.attendance.findIndex(
        a => a.studentId === studentId && a.date === date
      );

      const attendanceRecord = {
        id: existingIndex >= 0 ? db.attendance[existingIndex].id : uuidv4(),
        studentId,
        date,
        status: status || 'absent',
        markedAt: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        // Update existing
        db.attendance[existingIndex] = attendanceRecord;
      } else {
        // Add new
        db.attendance.push(attendanceRecord);
      }

      results.push({
        ...attendanceRecord,
        studentName: student.name
      });
    });

    res.json({
      success: true,
      message: `Attendance marked for ${results.length} students`,
      date,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  });

  // Update single attendance record
  router.put('/:id', (req, res) => {
    const { status } = req.body;
    const recordIndex = db.attendance.findIndex(a => a.id === req.params.id);

    if (recordIndex === -1) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    db.attendance[recordIndex] = {
      ...db.attendance[recordIndex],
      status,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Attendance updated',
      record: db.attendance[recordIndex]
    });
  });

  // Delete attendance record
  router.delete('/:id', (req, res) => {
    const recordIndex = db.attendance.findIndex(a => a.id === req.params.id);

    if (recordIndex === -1) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    db.attendance.splice(recordIndex, 1);

    res.json({
      success: true,
      message: 'Attendance record deleted'
    });
  });

  // Get attendance summary for all students
  router.get('/summary/all', (req, res) => {
    const { startDate, endDate } = req.query;

    const summaries = db.students.map(student => {
      let records = db.attendance.filter(r => r.studentId === student.id);

      if (startDate && endDate) {
        records = records.filter(r => r.date >= startDate && r.date <= endDate);
      }

      const totalDays = records.length;
      const presentDays = records.filter(r => r.status === 'present').length;
      const absentDays = records.filter(r => r.status === 'absent').length;
      const lateDays = records.filter(r => r.status === 'late').length;
      const percentage = totalDays > 0 ? ((presentDays + (lateDays * 0.5)) / totalDays * 100).toFixed(2) : 0;

      return {
        studentId: student.id,
        studentName: student.name,
        rollNumber: student.rollNumber,
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        percentage: parseFloat(percentage)
      };
    });

    res.json(summaries);
  });

  return router;
};

