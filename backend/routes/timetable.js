const express = require('express');
const { v4: uuidv4 } = require('uuid');

module.exports = (db) => {
  const router = express.Router();

  // Get timetable
  router.get('/', (req, res) => {
    const { departmentId, semester, section, teacherId, day } = req.query;
    let schedule = [...db.timetable];

    if (departmentId) {
      schedule = schedule.filter(s => s.departmentId === departmentId);
    }
    if (semester) {
      schedule = schedule.filter(s => s.semester === parseInt(semester));
    }
    if (section) {
      schedule = schedule.filter(s => s.section === section);
    }
    if (teacherId) {
      schedule = schedule.filter(s => s.teacherId === teacherId);
    }
    if (day) {
      schedule = schedule.filter(s => s.day === day);
    }

    // Enrich with subject and teacher details
    const enriched = schedule.map(slot => {
      const subject = db.subjects.find(s => s.id === slot.subjectId);
      const teacher = db.teachers.find(t => t.id === slot.teacherId);
      return {
        ...slot,
        subjectName: subject ? subject.name : 'Unknown',
        subjectCode: subject ? subject.code : '',
        teacherName: teacher ? teacher.name : 'Unknown'
      };
    });

    // Group by day
    const grouped = {};
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    dayOrder.forEach(d => {
      const daySchedule = enriched.filter(s => s.day === d);
      if (daySchedule.length > 0) {
        grouped[d] = daySchedule.sort((a, b) => a.startTime.localeCompare(b.startTime));
      }
    });

    res.json({
      schedule: enriched,
      grouped,
      days: Object.keys(grouped)
    });
  });

  // Get student's timetable
  router.get('/student/:studentId', (req, res) => {
    const student = db.students.find(s => s.id === req.params.studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const schedule = db.timetable.filter(s => 
      s.departmentId === student.departmentId && 
      s.semester === student.semester &&
      s.section === student.section
    );

    const enriched = schedule.map(slot => {
      const subject = db.subjects.find(s => s.id === slot.subjectId);
      const teacher = db.teachers.find(t => t.id === slot.teacherId);
      return {
        ...slot,
        subjectName: subject ? subject.name : 'Unknown',
        subjectCode: subject ? subject.code : '',
        teacherName: teacher ? teacher.name : 'TBA'
      };
    });

    // Group by day
    const grouped = {};
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    dayOrder.forEach(d => {
      const daySchedule = enriched.filter(s => s.day === d);
      if (daySchedule.length > 0) {
        grouped[d] = daySchedule.sort((a, b) => a.startTime.localeCompare(b.startTime));
      }
    });

    res.json({
      student: {
        name: student.name,
        rollNumber: student.rollNumber,
        semester: student.semester,
        section: student.section
      },
      schedule: enriched,
      grouped
    });
  });

  // Get teacher's timetable
  router.get('/teacher/:teacherId', (req, res) => {
    const teacher = db.teachers.find(t => t.id === req.params.teacherId);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const schedule = db.timetable.filter(s => s.teacherId === teacher.id);

    const enriched = schedule.map(slot => {
      const subject = db.subjects.find(s => s.id === slot.subjectId);
      const dept = db.departments.find(d => d.id === slot.departmentId);
      return {
        ...slot,
        subjectName: subject ? subject.name : 'Unknown',
        subjectCode: subject ? subject.code : '',
        departmentName: dept ? dept.name : 'Unknown'
      };
    });

    // Group by day
    const grouped = {};
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    dayOrder.forEach(d => {
      const daySchedule = enriched.filter(s => s.day === d);
      if (daySchedule.length > 0) {
        grouped[d] = daySchedule.sort((a, b) => a.startTime.localeCompare(b.startTime));
      }
    });

    res.json({
      teacher: {
        name: teacher.name,
        designation: teacher.designation
      },
      schedule: enriched,
      grouped,
      totalClasses: schedule.length
    });
  });

  // Add timetable slot
  router.post('/', (req, res) => {
    const { day, startTime, endTime, subjectId, teacherId, room, departmentId, semester, section, type } = req.body;

    if (!day || !startTime || !endTime || !subjectId) {
      return res.status(400).json({ error: 'Day, startTime, endTime, and subjectId are required' });
    }

    // Check for conflicts
    const conflict = db.timetable.find(s => 
      s.day === day &&
      s.departmentId === departmentId &&
      s.semester === semester &&
      s.section === section &&
      ((startTime >= s.startTime && startTime < s.endTime) ||
       (endTime > s.startTime && endTime <= s.endTime))
    );

    if (conflict) {
      return res.status(400).json({ error: 'Time slot conflicts with existing schedule' });
    }

    const newSlot = {
      id: uuidv4(),
      day,
      startTime,
      endTime,
      subjectId,
      teacherId: teacherId || null,
      room: room || 'TBA',
      departmentId: departmentId || 'dept-001',
      semester: semester || 1,
      section: section || 'A',
      type: type || 'lecture',
      createdAt: new Date().toISOString()
    };

    db.timetable.push(newSlot);

    res.status(201).json({
      success: true,
      message: 'Timetable slot added',
      slot: newSlot
    });
  });

  // Update timetable slot
  router.put('/:id', (req, res) => {
    const slotIndex = db.timetable.findIndex(s => s.id === req.params.id);
    if (slotIndex === -1) {
      return res.status(404).json({ error: 'Timetable slot not found' });
    }

    const updates = req.body;
    delete updates.id;
    delete updates.createdAt;

    db.timetable[slotIndex] = {
      ...db.timetable[slotIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Timetable slot updated',
      slot: db.timetable[slotIndex]
    });
  });

  // Delete timetable slot
  router.delete('/:id', (req, res) => {
    const slotIndex = db.timetable.findIndex(s => s.id === req.params.id);
    if (slotIndex === -1) {
      return res.status(404).json({ error: 'Timetable slot not found' });
    }

    db.timetable.splice(slotIndex, 1);

    res.json({
      success: true,
      message: 'Timetable slot deleted'
    });
  });

  // Get exam schedule
  router.get('/exams', (req, res) => {
    const { type, departmentId } = req.query;
    let exams = [...db.examSchedule];

    if (type) {
      exams = exams.filter(e => e.type === type);
    }

    const enriched = exams.map(exam => {
      const subject = db.subjects.find(s => s.id === exam.subjectId);
      return {
        ...exam,
        subjectName: subject ? subject.name : 'Unknown',
        subjectCode: subject ? subject.code : ''
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(enriched);
  });

  // Add exam schedule
  router.post('/exams', (req, res) => {
    const { subjectId, date, startTime, endTime, room, type } = req.body;

    if (!subjectId || !date || !startTime || !endTime) {
      return res.status(400).json({ error: 'subjectId, date, startTime, and endTime are required' });
    }

    const newExam = {
      id: uuidv4(),
      subjectId,
      date,
      startTime,
      endTime,
      room: room || 'TBA',
      type: type || 'midterm',
      createdAt: new Date().toISOString()
    };

    db.examSchedule.push(newExam);

    res.status(201).json({
      success: true,
      message: 'Exam scheduled',
      exam: newExam
    });
  });

  return router;
};

