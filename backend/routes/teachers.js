const express = require('express');
const { v4: uuidv4 } = require('uuid');

module.exports = (db) => {
  const router = express.Router();

  // Get all teachers
  router.get('/', (req, res) => {
    const teachers = db.teachers.map(t => {
      const dept = db.departments.find(d => d.id === t.departmentId);
      const subjectNames = t.subjects.map(sId => {
        const sub = db.subjects.find(s => s.id === sId);
        return sub ? sub.name : 'Unknown';
      });
      
      return {
        ...t,
        password: undefined,
        departmentName: dept ? dept.name : 'Not Assigned',
        subjectNames
      };
    });
    res.json(teachers);
  });

  // Get single teacher
  router.get('/:id', (req, res) => {
    const teacher = db.teachers.find(t => t.id === req.params.id);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    const dept = db.departments.find(d => d.id === teacher.departmentId);
    const subjectDetails = teacher.subjects.map(sId => db.subjects.find(s => s.id === sId)).filter(Boolean);
    
    res.json({
      ...teacher,
      password: undefined,
      departmentName: dept ? dept.name : 'Not Assigned',
      subjectDetails
    });
  });

  // Add new teacher
  router.post('/', (req, res) => {
    const { name, email, password, phone, departmentId, designation, specialization, qualification, subjects } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingEmail = db.users.find(u => u.email === email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const newTeacher = {
      id: uuidv4(),
      email,
      password,
      role: 'teacher',
      name,
      phone: phone || '',
      departmentId: departmentId || null,
      designation: designation || 'Lecturer',
      specialization: specialization || '',
      qualification: qualification || '',
      joinDate: new Date().toISOString().split('T')[0],
      subjects: subjects || [],
      avatar: null,
      createdAt: new Date().toISOString()
    };

    db.teachers.push(newTeacher);
    db.users.push({
      id: newTeacher.id,
      email: newTeacher.email,
      password: newTeacher.password,
      role: 'teacher',
      name: newTeacher.name,
      createdAt: newTeacher.createdAt
    });

    res.status(201).json({
      success: true,
      message: 'Teacher added successfully',
      teacher: { ...newTeacher, password: undefined }
    });
  });

  // Update teacher
  router.put('/:id', (req, res) => {
    const teacherIndex = db.teachers.findIndex(t => t.id === req.params.id);
    if (teacherIndex === -1) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const updates = req.body;
    delete updates.id;
    delete updates.createdAt;

    db.teachers[teacherIndex] = {
      ...db.teachers[teacherIndex],
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
      message: 'Teacher updated successfully',
      teacher: { ...db.teachers[teacherIndex], password: undefined }
    });
  });

  // Delete teacher
  router.delete('/:id', (req, res) => {
    const teacherIndex = db.teachers.findIndex(t => t.id === req.params.id);
    if (teacherIndex === -1) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const deleted = db.teachers.splice(teacherIndex, 1)[0];
    
    // Remove from users
    const userIndex = db.users.findIndex(u => u.id === req.params.id);
    if (userIndex !== -1) {
      db.users.splice(userIndex, 1);
    }

    res.json({
      success: true,
      message: 'Teacher deleted successfully',
      teacher: { id: deleted.id, name: deleted.name }
    });
  });

  // Assign subjects to teacher
  router.post('/:id/subjects', (req, res) => {
    const teacherIndex = db.teachers.findIndex(t => t.id === req.params.id);
    if (teacherIndex === -1) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const { subjectIds } = req.body;
    if (!Array.isArray(subjectIds)) {
      return res.status(400).json({ error: 'subjectIds must be an array' });
    }

    db.teachers[teacherIndex].subjects = subjectIds;
    db.teachers[teacherIndex].updatedAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Subjects assigned successfully',
      teacher: { ...db.teachers[teacherIndex], password: undefined }
    });
  });

  // Get teacher's students (based on department/subjects)
  router.get('/:id/students', (req, res) => {
    const teacher = db.teachers.find(t => t.id === req.params.id);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const students = db.students.filter(s => s.departmentId === teacher.departmentId);
    res.json(students.map(s => ({ ...s, password: undefined })));
  });

  return router;
};

