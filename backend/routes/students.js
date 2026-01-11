const express = require('express');
const { v4: uuidv4 } = require('uuid');

module.exports = (db) => {
  const router = express.Router();

  // Get all students with optional filters
  router.get('/', (req, res) => {
    const { departmentId, semester, section, status, search } = req.query;
    let students = [...db.students];

    if (departmentId) {
      students = students.filter(s => s.departmentId === departmentId);
    }
    if (semester) {
      students = students.filter(s => s.semester === parseInt(semester));
    }
    if (section) {
      students = students.filter(s => s.section === section);
    }
    if (status) {
      students = students.filter(s => s.status === status);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      students = students.filter(s => 
        s.name.toLowerCase().includes(searchLower) ||
        s.rollNumber.toLowerCase().includes(searchLower) ||
        s.email.toLowerCase().includes(searchLower)
      );
    }

    // Enrich with department name
    const enriched = students.map(s => {
      const dept = db.departments.find(d => d.id === s.departmentId);
      const feeRecord = db.feePayments.find(f => f.studentId === s.id);
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        rollNumber: s.rollNumber,
        department: dept?.name || 'Not Assigned',
        departmentId: s.departmentId,
        semester: s.semester,
        section: s.section,
        phone: s.phone,
        gender: s.gender,
        cgpa: s.cgpa,
        status: s.status,
        feeStatus: feeRecord?.status || 'unknown',
        avatar: s.avatar,
        createdAt: s.createdAt
      };
    });

    res.json(enriched);
  });

  // Get single student with full details
  router.get('/:id', (req, res) => {
    const student = db.students.find(s => s.id === req.params.id);
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const dept = db.departments.find(d => d.id === student.departmentId);
    const feeRecord = db.feePayments.find(f => f.studentId === student.id);

    // Get attendance summary
    const attendance = db.attendance.filter(a => a.studentId === student.id);
    const presentDays = attendance.filter(a => a.status === 'present').length;
    const attendancePercentage = attendance.length > 0 
      ? ((presentDays / attendance.length) * 100).toFixed(1) 
      : 0;

    // Get marks summary
    const marks = db.marks.filter(m => m.studentId === student.id);
    const totalObtained = marks.reduce((sum, m) => sum + m.obtainedMarks, 0);
    const totalMax = marks.reduce((sum, m) => sum + m.maxMarks, 0);

    res.json({
      id: student.id,
      name: student.name,
      email: student.email,
      rollNumber: student.rollNumber,
      department: dept?.name || 'Not Assigned',
      departmentId: student.departmentId,
      semester: student.semester,
      section: student.section,
      phone: student.phone,
      address: student.address,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
      bloodGroup: student.bloodGroup,
      admissionDate: student.admissionDate,
      cgpa: student.cgpa,
      status: student.status,
      avatar: student.avatar,
      createdAt: student.createdAt,
      summary: {
        attendance: {
          total: attendance.length,
          present: presentDays,
          percentage: attendancePercentage
        },
        academics: {
          totalMarks: totalMax,
          obtainedMarks: totalObtained,
          percentage: totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : 0
        },
        fees: feeRecord ? {
          status: feeRecord.status,
          totalDue: feeRecord.totalAmount,
          paid: feeRecord.paidAmount,
          balance: feeRecord.totalAmount - feeRecord.paidAmount
        } : null
      }
    });
  });

  // Add new student
  router.post('/', (req, res) => {
    const { 
      name, email, password, rollNumber, departmentId, 
      semester, section, phone, address, dateOfBirth, gender,
      guardianName, guardianPhone, bloodGroup, admissionDate
    } = req.body;

    if (!name || !email || !password || !rollNumber) {
      return res.status(400).json({ error: 'Name, email, password, and roll number are required' });
    }

    // Check if email or roll number already exists
    const existingEmail = db.students.find(s => s.email === email) || db.users.find(u => u.email === email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const existingRoll = db.students.find(s => s.rollNumber === rollNumber);
    if (existingRoll) {
      return res.status(400).json({ error: 'Roll number already exists' });
    }

    const newStudent = {
      id: uuidv4(),
      name,
      email,
      password,
      rollNumber,
      departmentId: departmentId || 'dept-001',
      semester: semester || 1,
      section: section || 'A',
      phone: phone || '',
      address: address || '',
      dateOfBirth: dateOfBirth || '',
      gender: gender || 'Not Specified',
      guardianName: guardianName || '',
      guardianPhone: guardianPhone || '',
      bloodGroup: bloodGroup || '',
      admissionDate: admissionDate || new Date().toISOString().split('T')[0],
      status: 'active',
      cgpa: '0.00',
      avatar: null,
      createdAt: new Date().toISOString()
    };

    db.students.push(newStudent);

    // Add to users for login
    db.users.push({
      id: newStudent.id,
      email: newStudent.email,
      password: newStudent.password,
      role: 'student',
      name: newStudent.name,
      createdAt: newStudent.createdAt
    });

    // Create fee record
    const totalFee = 45000 + 5000 + 2000 + 1500 + 3000;
    db.feePayments.push({
      id: `payment-${newStudent.id}`,
      studentId: newStudent.id,
      semesterId: 'sem-001',
      totalAmount: totalFee,
      paidAmount: 0,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
      payments: [],
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Student added successfully',
      student: {
        ...newStudent,
        password: undefined
      }
    });
  });

  // Update student
  router.put('/:id', (req, res) => {
    const studentIndex = db.students.findIndex(s => s.id === req.params.id);
    
    if (studentIndex === -1) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const updates = req.body;
    delete updates.id;
    delete updates.createdAt;

    // Check email uniqueness
    if (updates.email && updates.email !== db.students[studentIndex].email) {
      const existingEmail = db.students.find(s => s.email === updates.email);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // Check roll number uniqueness
    if (updates.rollNumber && updates.rollNumber !== db.students[studentIndex].rollNumber) {
      const existingRoll = db.students.find(s => s.rollNumber === updates.rollNumber);
      if (existingRoll) {
        return res.status(400).json({ error: 'Roll number already exists' });
      }
    }

    db.students[studentIndex] = {
      ...db.students[studentIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Update user record
    const userIndex = db.users.findIndex(u => u.id === req.params.id);
    if (userIndex !== -1) {
      if (updates.name) db.users[userIndex].name = updates.name;
      if (updates.email) db.users[userIndex].email = updates.email;
      if (updates.password) db.users[userIndex].password = updates.password;
    }

    res.json({
      success: true,
      message: 'Student updated successfully',
      student: {
        ...db.students[studentIndex],
        password: undefined
      }
    });
  });

  // Delete student
  router.delete('/:id', (req, res) => {
    const studentIndex = db.students.findIndex(s => s.id === req.params.id);
    
    if (studentIndex === -1) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const deletedStudent = db.students.splice(studentIndex, 1)[0];

    // Delete from users
    const userIndex = db.users.findIndex(u => u.id === req.params.id);
    if (userIndex !== -1) {
      db.users.splice(userIndex, 1);
    }

    // Delete related data
    db.attendance = db.attendance.filter(a => a.studentId !== req.params.id);
    db.marks = db.marks.filter(m => m.studentId !== req.params.id);
    db.feePayments = db.feePayments.filter(f => f.studentId !== req.params.id);
    db.notifications = db.notifications.filter(n => n.userId !== req.params.id);

    res.json({
      success: true,
      message: 'Student deleted successfully',
      student: {
        id: deletedStudent.id,
        name: deletedStudent.name
      }
    });
  });

  // Get subjects (for dropdown)
  router.get('/data/subjects', (req, res) => {
    res.json(db.subjects);
  });

  // Get departments (for dropdown)
  router.get('/data/departments', (req, res) => {
    res.json(db.departments);
  });

  // Update student status
  router.patch('/:id/status', (req, res) => {
    const { status } = req.body;
    const studentIndex = db.students.findIndex(s => s.id === req.params.id);
    
    if (studentIndex === -1) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (!['active', 'inactive', 'graduated', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    db.students[studentIndex].status = status;
    db.students[studentIndex].updatedAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Status updated',
      student: { id: db.students[studentIndex].id, status }
    });
  });

  // Promote students to next semester
  router.post('/promote', (req, res) => {
    const { studentIds, newSemester } = req.body;

    if (!Array.isArray(studentIds) || !newSemester) {
      return res.status(400).json({ error: 'studentIds array and newSemester are required' });
    }

    const promoted = [];
    studentIds.forEach(id => {
      const index = db.students.findIndex(s => s.id === id);
      if (index !== -1) {
        db.students[index].semester = newSemester;
        db.students[index].updatedAt = new Date().toISOString();
        promoted.push({ id, name: db.students[index].name, newSemester });
      }
    });

    res.json({
      success: true,
      message: `${promoted.length} students promoted to semester ${newSemester}`,
      promoted
    });
  });

  return router;
};
