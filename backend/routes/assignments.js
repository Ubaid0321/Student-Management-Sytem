const express = require('express');
const { v4: uuidv4 } = require('uuid');

module.exports = (db) => {
  const router = express.Router();

  // Initialize assignments array if not exists
  if (!db.assignments) db.assignments = [];
  if (!db.submissions) db.submissions = [];

  // Get all assignments (with filters)
  router.get('/', (req, res) => {
    const { subjectId, teacherId, status } = req.query;
    let assignments = [...db.assignments];

    if (subjectId) assignments = assignments.filter(a => a.subjectId === subjectId);
    if (teacherId) assignments = assignments.filter(a => a.teacherId === teacherId);
    
    const now = new Date();
    if (status === 'active') {
      assignments = assignments.filter(a => new Date(a.dueDate) >= now);
    } else if (status === 'past') {
      assignments = assignments.filter(a => new Date(a.dueDate) < now);
    }

    // Enrich with subject and teacher details
    const enriched = assignments.map(a => {
      const subject = db.subjects.find(s => s.id === a.subjectId);
      const teacher = db.teachers.find(t => t.id === a.teacherId);
      const submissionCount = db.submissions.filter(s => s.assignmentId === a.id).length;
      
      return {
        ...a,
        subjectName: subject?.name || 'Unknown',
        subjectCode: subject?.code || '',
        teacherName: teacher?.name || 'Unknown',
        submissionCount,
        totalStudents: db.students.length,
        isOverdue: new Date(a.dueDate) < now
      };
    });

    res.json(enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  });

  // Get assignment by ID
  router.get('/:id', (req, res) => {
    const assignment = db.assignments.find(a => a.id === req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const subject = db.subjects.find(s => s.id === assignment.subjectId);
    const teacher = db.teachers.find(t => t.id === assignment.teacherId);
    const submissions = db.submissions.filter(s => s.assignmentId === assignment.id);

    res.json({
      ...assignment,
      subjectName: subject?.name,
      subjectCode: subject?.code,
      teacherName: teacher?.name,
      submissions: submissions.map(s => {
        const student = db.students.find(st => st.id === s.studentId);
        return {
          ...s,
          studentName: student?.name,
          rollNumber: student?.rollNumber
        };
      })
    });
  });

  // Create assignment
  router.post('/', (req, res) => {
    const { title, description, subjectId, teacherId, dueDate, totalMarks, attachments, type } = req.body;

    if (!title || !subjectId || !dueDate || !totalMarks) {
      return res.status(400).json({ error: 'Title, subject, due date, and total marks are required' });
    }

    const assignment = {
      id: uuidv4(),
      title,
      description: description || '',
      subjectId,
      teacherId,
      dueDate,
      totalMarks: parseInt(totalMarks),
      type: type || 'assignment', // assignment, quiz, project, lab
      attachments: attachments || [],
      status: 'active',
      createdAt: new Date().toISOString()
    };

    db.assignments.push(assignment);

    // Send notification to all students
    db.students.forEach(student => {
      db.notifications.push({
        id: uuidv4(),
        userId: student.id,
        title: 'New Assignment',
        message: `${title} has been posted. Due: ${new Date(dueDate).toLocaleDateString()}`,
        type: 'assignment',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      assignment
    });
  });

  // Update assignment
  router.put('/:id', (req, res) => {
    const index = db.assignments.findIndex(a => a.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const updates = req.body;
    delete updates.id;
    delete updates.createdAt;

    db.assignments[index] = {
      ...db.assignments[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Assignment updated successfully',
      assignment: db.assignments[index]
    });
  });

  // Delete assignment
  router.delete('/:id', (req, res) => {
    const index = db.assignments.findIndex(a => a.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    db.assignments.splice(index, 1);
    // Also delete related submissions
    db.submissions = db.submissions.filter(s => s.assignmentId !== req.params.id);

    res.json({ success: true, message: 'Assignment deleted successfully' });
  });

  // Submit assignment (student)
  router.post('/:id/submit', (req, res) => {
    const assignment = db.assignments.find(a => a.id === req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const { studentId, content, attachments } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    // Check if already submitted
    const existingSubmission = db.submissions.find(
      s => s.assignmentId === assignment.id && s.studentId === studentId
    );

    const isLate = new Date() > new Date(assignment.dueDate);

    if (existingSubmission) {
      // Update existing submission
      existingSubmission.content = content || existingSubmission.content;
      existingSubmission.attachments = attachments || existingSubmission.attachments;
      existingSubmission.updatedAt = new Date().toISOString();
      existingSubmission.isLate = isLate;
      existingSubmission.status = 'resubmitted';

      return res.json({
        success: true,
        message: 'Assignment resubmitted successfully',
        submission: existingSubmission
      });
    }

    const submission = {
      id: uuidv4(),
      assignmentId: assignment.id,
      studentId,
      content: content || '',
      attachments: attachments || [],
      status: 'submitted',
      isLate,
      obtainedMarks: null,
      feedback: '',
      gradedBy: null,
      gradedAt: null,
      submittedAt: new Date().toISOString()
    };

    db.submissions.push(submission);

    res.status(201).json({
      success: true,
      message: isLate ? 'Assignment submitted (late)' : 'Assignment submitted successfully',
      submission
    });
  });

  // Grade submission (teacher)
  router.put('/submission/:submissionId/grade', (req, res) => {
    const index = db.submissions.findIndex(s => s.id === req.params.submissionId);
    if (index === -1) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const { obtainedMarks, feedback, gradedBy } = req.body;

    db.submissions[index] = {
      ...db.submissions[index],
      obtainedMarks: parseInt(obtainedMarks),
      feedback: feedback || '',
      gradedBy,
      gradedAt: new Date().toISOString(),
      status: 'graded'
    };

    // Send notification to student
    db.notifications.push({
      id: uuidv4(),
      userId: db.submissions[index].studentId,
      title: 'Assignment Graded',
      message: `Your assignment has been graded. Marks: ${obtainedMarks}`,
      type: 'grade',
      isRead: false,
      createdAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Submission graded successfully',
      submission: db.submissions[index]
    });
  });

  // Get student's assignments
  router.get('/student/:studentId', (req, res) => {
    const { studentId } = req.params;
    const now = new Date();

    const studentAssignments = db.assignments.map(a => {
      const subject = db.subjects.find(s => s.id === a.subjectId);
      const submission = db.submissions.find(s => s.assignmentId === a.id && s.studentId === studentId);
      const isOverdue = new Date(a.dueDate) < now;

      return {
        ...a,
        subjectName: subject?.name,
        subjectCode: subject?.code,
        isOverdue,
        submission: submission ? {
          status: submission.status,
          submittedAt: submission.submittedAt,
          isLate: submission.isLate,
          obtainedMarks: submission.obtainedMarks,
          feedback: submission.feedback
        } : null
      };
    });

    const pending = studentAssignments.filter(a => !a.submission && !a.isOverdue);
    const submitted = studentAssignments.filter(a => a.submission);
    const missed = studentAssignments.filter(a => !a.submission && a.isOverdue);

    res.json({
      pending,
      submitted,
      missed,
      summary: {
        total: studentAssignments.length,
        pending: pending.length,
        submitted: submitted.length,
        missed: missed.length,
        graded: submitted.filter(a => a.submission?.status === 'graded').length
      }
    });
  });

  return router;
};

