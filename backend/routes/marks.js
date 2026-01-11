const express = require('express');
const { v4: uuidv4 } = require('uuid');

module.exports = (db) => {
  const router = express.Router();

  // Grade calculation helper
  const calculateGrade = (percentage) => {
    const p = parseFloat(percentage);
    if (p >= 90) return { grade: 'A+', gpa: 4.0 };
    if (p >= 85) return { grade: 'A', gpa: 4.0 };
    if (p >= 80) return { grade: 'A-', gpa: 3.7 };
    if (p >= 75) return { grade: 'B+', gpa: 3.3 };
    if (p >= 70) return { grade: 'B', gpa: 3.0 };
    if (p >= 65) return { grade: 'B-', gpa: 2.7 };
    if (p >= 60) return { grade: 'C+', gpa: 2.3 };
    if (p >= 55) return { grade: 'C', gpa: 2.0 };
    if (p >= 50) return { grade: 'C-', gpa: 1.7 };
    if (p >= 45) return { grade: 'D', gpa: 1.0 };
    return { grade: 'F', gpa: 0.0 };
  };

  // Get all marks with filters
  router.get('/', (req, res) => {
    let { studentId, subjectId, examType, semesterId } = req.query;
    let records = [...db.marks];

    if (studentId) records = records.filter(r => r.studentId === studentId);
    if (subjectId) records = records.filter(r => r.subjectId === subjectId);
    if (examType) records = records.filter(r => r.examType === examType);
    if (semesterId) records = records.filter(r => r.semesterId === semesterId);

    // Enrich with details
    const enriched = records.map(record => {
      const student = db.students.find(s => s.id === record.studentId);
      const subject = db.subjects.find(s => s.id === record.subjectId);
      return {
        ...record,
        studentName: student?.name || 'Unknown',
        studentRollNumber: student?.rollNumber || 'Unknown',
        subjectName: subject?.name || 'Unknown',
        subjectCode: subject?.code || ''
      };
    });

    res.json(enriched);
  });

  // Get marks for a specific student
  router.get('/student/:studentId', (req, res) => {
    const { studentId } = req.params;
    const { semesterId, examType } = req.query;

    let records = db.marks.filter(r => r.studentId === studentId);
    
    if (semesterId) records = records.filter(r => r.semesterId === semesterId);
    if (examType) records = records.filter(r => r.examType === examType);

    // Group by subject
    const bySubject = {};
    records.forEach(record => {
      const subject = db.subjects.find(s => s.id === record.subjectId);
      if (!bySubject[record.subjectId]) {
        bySubject[record.subjectId] = {
          subjectId: record.subjectId,
          subjectName: subject?.name || 'Unknown',
          subjectCode: subject?.code || '',
          creditHours: subject?.creditHours || 3,
          exams: []
        };
      }
      bySubject[record.subjectId].exams.push({
        examType: record.examType,
        maxMarks: record.maxMarks,
        obtainedMarks: record.obtainedMarks,
        percentage: record.percentage,
        grade: record.grade
      });
    });

    // Calculate totals for each subject
    Object.values(bySubject).forEach(subject => {
      const totalObtained = subject.exams.reduce((sum, e) => sum + e.obtainedMarks, 0);
      const totalMax = subject.exams.reduce((sum, e) => sum + e.maxMarks, 0);
      const percentage = ((totalObtained / totalMax) * 100).toFixed(2);
      const { grade, gpa } = calculateGrade(percentage);
      
      subject.totalObtained = totalObtained;
      subject.totalMax = totalMax;
      subject.percentage = percentage;
      subject.grade = grade;
      subject.gpa = gpa;
    });

    // Calculate CGPA
    let totalCreditPoints = 0;
    let totalCredits = 0;
    Object.values(bySubject).forEach(subject => {
      totalCreditPoints += subject.gpa * subject.creditHours;
      totalCredits += subject.creditHours;
    });
    const cgpa = totalCredits > 0 ? (totalCreditPoints / totalCredits).toFixed(2) : 0;

    // Overall summary
    const totalMarks = records.reduce((sum, r) => sum + r.maxMarks, 0);
    const obtainedMarks = records.reduce((sum, r) => sum + r.obtainedMarks, 0);

    res.json({
      subjects: Object.values(bySubject),
      summary: {
        totalSubjects: Object.keys(bySubject).length,
        totalExams: records.length,
        totalMarks,
        obtainedMarks,
        percentage: totalMarks > 0 ? ((obtainedMarks / totalMarks) * 100).toFixed(2) : 0,
        cgpa: parseFloat(cgpa),
        totalCredits
      }
    });
  });

  // Add marks
  router.post('/', (req, res) => {
    const { studentId, subjectId, examType, maxMarks, obtainedMarks, semesterId, remarks, addedBy } = req.body;

    if (!studentId || !subjectId || !examType || maxMarks === undefined || obtainedMarks === undefined) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    const student = db.students.find(s => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if already exists
    const existing = db.marks.find(m => 
      m.studentId === studentId && 
      m.subjectId === subjectId && 
      m.examType === examType
    );

    const percentage = ((obtainedMarks / maxMarks) * 100).toFixed(2);
    const { grade } = calculateGrade(percentage);

    const markRecord = {
      id: existing ? existing.id : uuidv4(),
      studentId,
      subjectId,
      examType,
      maxMarks,
      obtainedMarks,
      percentage,
      grade,
      semesterId: semesterId || 'sem-001',
      remarks: remarks || '',
      addedBy: addedBy || 'admin-001',
      addedAt: new Date().toISOString()
    };

    if (existing) {
      const index = db.marks.findIndex(m => m.id === existing.id);
      db.marks[index] = markRecord;
    } else {
      db.marks.push(markRecord);
    }

    res.status(existing ? 200 : 201).json({
      success: true,
      message: existing ? 'Marks updated successfully' : 'Marks added successfully',
      record: markRecord
    });
  });

  // Add marks in bulk (for multiple students)
  router.post('/bulk', (req, res) => {
    let { subjectId, examType, maxMarks, records, marks, semesterId, addedBy } = req.body;

    // Support both formats: {records: [...]} or {marks: [...]}
    const marksArray = records || marks || [];

    // If using the new format where each record has complete data
    if (marksArray.length > 0 && marksArray[0].subjectId) {
      subjectId = marksArray[0].subjectId;
      examType = marksArray[0].examType;
      maxMarks = marksArray[0].maxMarks;
    }

    if (!subjectId || !examType || !maxMarks || marksArray.length === 0) {
      return res.status(400).json({ error: 'subjectId, examType, maxMarks, and records/marks are required' });
    }

    const results = [];
    const errors = [];

    marksArray.forEach(record => {
      const { studentId, obtainedMarks } = record;
      
      const student = db.students.find(s => s.id === studentId);
      if (!student) {
        errors.push({ studentId, error: 'Student not found' });
        return;
      }

      const percentage = ((obtainedMarks / maxMarks) * 100).toFixed(2);
      const { grade } = calculateGrade(percentage);

      const existing = db.marks.find(m => 
        m.studentId === studentId && 
        m.subjectId === subjectId && 
        m.examType === examType
      );

      const markRecord = {
        id: existing ? existing.id : uuidv4(),
        studentId,
        subjectId,
        examType,
        maxMarks,
        obtainedMarks,
        percentage,
        grade,
        semesterId: semesterId || 'sem-001',
        remarks: '',
        addedBy: addedBy || 'admin-001',
        addedAt: new Date().toISOString()
      };

      if (existing) {
        const index = db.marks.findIndex(m => m.id === existing.id);
        db.marks[index] = markRecord;
      } else {
        db.marks.push(markRecord);
      }

      results.push({
        ...markRecord,
        studentName: student.name
      });
    });

    res.json({
      success: true,
      message: `Marks added for ${results.length} students`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  });

  // Delete marks record
  router.delete('/:id', (req, res) => {
    const index = db.marks.findIndex(m => m.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Record not found' });
    }

    db.marks.splice(index, 1);
    res.json({ success: true, message: 'Record deleted' });
  });

  // Get all subjects
  router.get('/subjects/all', (req, res) => {
    const subjects = db.subjects.map(s => {
      const dept = db.departments.find(d => d.id === s.departmentId);
      return {
        ...s,
        departmentName: dept?.name || 'General'
      };
    });
    res.json(subjects);
  });

  // Add subject
  router.post('/subjects', (req, res) => {
    const { name, code, creditHours, type, departmentId } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    const existing = db.subjects.find(s => s.code === code);
    if (existing) {
      return res.status(400).json({ error: 'Subject code already exists' });
    }

    const newSubject = {
      id: uuidv4(),
      name,
      code,
      creditHours: creditHours || 3,
      type: type || 'elective',
      departmentId: departmentId || null
    };

    db.subjects.push(newSubject);

    res.status(201).json({
      success: true,
      message: 'Subject added',
      subject: newSubject
    });
  });

  // Get exam types
  router.get('/exam-types', (req, res) => {
    res.json([
      { value: 'quiz1', label: 'Quiz 1', maxMarks: 10 },
      { value: 'quiz2', label: 'Quiz 2', maxMarks: 10 },
      { value: 'quiz3', label: 'Quiz 3', maxMarks: 10 },
      { value: 'assignment1', label: 'Assignment 1', maxMarks: 10 },
      { value: 'assignment2', label: 'Assignment 2', maxMarks: 10 },
      { value: 'midterm', label: 'Mid Term', maxMarks: 30 },
      { value: 'final', label: 'Final Exam', maxMarks: 50 },
      { value: 'project', label: 'Project', maxMarks: 20 },
      { value: 'lab', label: 'Lab Exam', maxMarks: 20 },
      { value: 'presentation', label: 'Presentation', maxMarks: 10 }
    ]);
  });

  // Get class performance for a subject
  router.get('/performance/:subjectId', (req, res) => {
    const { examType } = req.query;
    let records = db.marks.filter(m => m.subjectId === req.params.subjectId);
    
    if (examType) {
      records = records.filter(r => r.examType === examType);
    }

    if (records.length === 0) {
      return res.json({ message: 'No records found', stats: null });
    }

    const percentages = records.map(r => parseFloat(r.percentage));
    const average = (percentages.reduce((a, b) => a + b, 0) / percentages.length).toFixed(2);
    const highest = Math.max(...percentages).toFixed(2);
    const lowest = Math.min(...percentages).toFixed(2);

    // Grade distribution
    const gradeDistribution = { 'A+': 0, 'A': 0, 'A-': 0, 'B+': 0, 'B': 0, 'B-': 0, 'C+': 0, 'C': 0, 'C-': 0, 'D': 0, 'F': 0 };
    records.forEach(r => {
      if (gradeDistribution.hasOwnProperty(r.grade)) {
        gradeDistribution[r.grade]++;
      }
    });

    const subject = db.subjects.find(s => s.id === req.params.subjectId);

    res.json({
      subject: {
        name: subject?.name,
        code: subject?.code
      },
      stats: {
        totalStudents: records.length,
        average,
        highest,
        lowest,
        passRate: ((records.filter(r => r.grade !== 'F').length / records.length) * 100).toFixed(1)
      },
      gradeDistribution
    });
  });

  return router;
};
