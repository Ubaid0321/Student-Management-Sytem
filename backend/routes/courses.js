const express = require('express');
const { v4: uuidv4 } = require('uuid');

module.exports = (db) => {
  const router = express.Router();

  // Initialize course enrollments
  if (!db.enrollments) db.enrollments = [];
  if (!db.courseOfferings) db.courseOfferings = [];

  // Initialize default course offerings
  if (db.courseOfferings.length === 0) {
    db.subjects.forEach(subject => {
      db.courseOfferings.push({
        id: uuidv4(),
        subjectId: subject.id,
        semesterId: 'sem-001',
        teacherId: db.teachers[0]?.id || null,
        capacity: 50,
        enrolled: 0,
        schedule: 'Mon, Wed 10:00 AM',
        room: `Room ${Math.floor(Math.random() * 10) + 101}`,
        status: 'open',
        createdAt: new Date().toISOString()
      });
    });
  }

  // Get available courses for registration
  router.get('/offerings', (req, res) => {
    const { semesterId, departmentId } = req.query;
    let offerings = [...db.courseOfferings];

    if (semesterId) offerings = offerings.filter(o => o.semesterId === semesterId);

    const enriched = offerings.map(o => {
      const subject = db.subjects.find(s => s.id === o.subjectId);
      const teacher = db.teachers.find(t => t.id === o.teacherId);
      const semester = db.semesters.find(s => s.id === o.semesterId);

      if (departmentId && subject?.departmentId !== departmentId) return null;

      return {
        ...o,
        subject: {
          id: subject?.id,
          name: subject?.name,
          code: subject?.code,
          creditHours: subject?.creditHours,
          type: subject?.type
        },
        teacher: {
          id: teacher?.id,
          name: teacher?.name
        },
        semester: semester?.name,
        availableSeats: o.capacity - o.enrolled,
        isFull: o.enrolled >= o.capacity
      };
    }).filter(Boolean);

    res.json(enriched);
  });

  // Get student's enrolled courses
  router.get('/student/:studentId', (req, res) => {
    const enrollments = db.enrollments
      .filter(e => e.studentId === req.params.studentId)
      .map(e => {
        const offering = db.courseOfferings.find(o => o.id === e.offeringId);
        const subject = db.subjects.find(s => s.id === offering?.subjectId);
        const teacher = db.teachers.find(t => t.id === offering?.teacherId);

        return {
          ...e,
          subject: {
            id: subject?.id,
            name: subject?.name,
            code: subject?.code,
            creditHours: subject?.creditHours
          },
          teacher: teacher?.name,
          schedule: offering?.schedule,
          room: offering?.room
        };
      });

    const totalCredits = enrollments.reduce((sum, e) => sum + (e.subject?.creditHours || 0), 0);

    res.json({
      enrollments,
      summary: {
        totalCourses: enrollments.length,
        totalCredits,
        semesterId: enrollments[0]?.semesterId || null
      }
    });
  });

  // Register for a course
  router.post('/register', (req, res) => {
    const { studentId, offeringId } = req.body;

    if (!studentId || !offeringId) {
      return res.status(400).json({ error: 'Student ID and Offering ID are required' });
    }

    // Check if already enrolled
    const existing = db.enrollments.find(
      e => e.studentId === studentId && e.offeringId === offeringId
    );
    if (existing) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    // Check course availability
    const offering = db.courseOfferings.find(o => o.id === offeringId);
    if (!offering) {
      return res.status(404).json({ error: 'Course offering not found' });
    }

    if (offering.enrolled >= offering.capacity) {
      return res.status(400).json({ error: 'Course is full' });
    }

    if (offering.status !== 'open') {
      return res.status(400).json({ error: 'Course registration is closed' });
    }

    // Check credit limit (max 21 credits per semester)
    const currentCredits = db.enrollments
      .filter(e => e.studentId === studentId && e.semesterId === offering.semesterId)
      .reduce((sum, e) => {
        const off = db.courseOfferings.find(o => o.id === e.offeringId);
        const sub = db.subjects.find(s => s.id === off?.subjectId);
        return sum + (sub?.creditHours || 0);
      }, 0);

    const subject = db.subjects.find(s => s.id === offering.subjectId);
    if (currentCredits + (subject?.creditHours || 0) > 21) {
      return res.status(400).json({ error: 'Cannot exceed 21 credit hours per semester' });
    }

    const enrollment = {
      id: uuidv4(),
      studentId,
      offeringId,
      semesterId: offering.semesterId,
      status: 'enrolled',
      enrolledAt: new Date().toISOString()
    };

    db.enrollments.push(enrollment);
    offering.enrolled++;

    res.status(201).json({
      success: true,
      message: `Successfully enrolled in ${subject?.name}`,
      enrollment: {
        ...enrollment,
        subject: subject?.name,
        creditHours: subject?.creditHours
      }
    });
  });

  // Drop a course
  router.delete('/drop/:enrollmentId', (req, res) => {
    const index = db.enrollments.findIndex(e => e.id === req.params.enrollmentId);
    if (index === -1) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    const enrollment = db.enrollments[index];
    
    // Check drop deadline (usually 2 weeks into semester)
    const offering = db.courseOfferings.find(o => o.id === enrollment.offeringId);
    const semester = db.semesters.find(s => s.id === offering?.semesterId);
    
    if (semester) {
      const dropDeadline = new Date(semester.startDate);
      dropDeadline.setDate(dropDeadline.getDate() + 14);
      
      if (new Date() > dropDeadline) {
        return res.status(400).json({ 
          error: 'Drop deadline has passed. Contact admin for course withdrawal.',
          deadline: dropDeadline.toISOString().split('T')[0]
        });
      }
    }

    // Update offering enrollment count
    if (offering) {
      offering.enrolled = Math.max(0, offering.enrolled - 1);
    }

    db.enrollments.splice(index, 1);

    const subject = db.subjects.find(s => s.id === offering?.subjectId);

    res.json({
      success: true,
      message: `Dropped ${subject?.name || 'course'} successfully`
    });
  });

  // Get course offering details with enrolled students
  router.get('/offering/:id', (req, res) => {
    const offering = db.courseOfferings.find(o => o.id === req.params.id);
    if (!offering) {
      return res.status(404).json({ error: 'Course offering not found' });
    }

    const subject = db.subjects.find(s => s.id === offering.subjectId);
    const teacher = db.teachers.find(t => t.id === offering.teacherId);
    
    const enrolledStudents = db.enrollments
      .filter(e => e.offeringId === offering.id)
      .map(e => {
        const student = db.students.find(s => s.id === e.studentId);
        return {
          id: student?.id,
          name: student?.name,
          rollNumber: student?.rollNumber,
          enrolledAt: e.enrolledAt
        };
      });

    res.json({
      ...offering,
      subject: {
        name: subject?.name,
        code: subject?.code,
        creditHours: subject?.creditHours,
        type: subject?.type
      },
      teacher: {
        id: teacher?.id,
        name: teacher?.name,
        email: teacher?.email
      },
      enrolledStudents,
      availableSeats: offering.capacity - offering.enrolled
    });
  });

  // Admin: Create course offering
  router.post('/offerings', (req, res) => {
    const { subjectId, semesterId, teacherId, capacity, schedule, room } = req.body;

    if (!subjectId || !semesterId) {
      return res.status(400).json({ error: 'Subject and semester are required' });
    }

    const offering = {
      id: uuidv4(),
      subjectId,
      semesterId,
      teacherId: teacherId || null,
      capacity: capacity || 50,
      enrolled: 0,
      schedule: schedule || 'TBA',
      room: room || 'TBA',
      status: 'open',
      createdAt: new Date().toISOString()
    };

    db.courseOfferings.push(offering);

    res.status(201).json({
      success: true,
      message: 'Course offering created',
      offering
    });
  });

  // Admin: Update course offering
  router.put('/offerings/:id', (req, res) => {
    const index = db.courseOfferings.findIndex(o => o.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Offering not found' });
    }

    const updates = req.body;
    delete updates.id;
    delete updates.enrolled;

    db.courseOfferings[index] = {
      ...db.courseOfferings[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Course offering updated',
      offering: db.courseOfferings[index]
    });
  });

  return router;
};

