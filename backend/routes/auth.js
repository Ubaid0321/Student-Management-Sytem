const express = require('express');
const { v4: uuidv4 } = require('uuid');

module.exports = (db) => {
  const router = express.Router();

  // Login
  router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check in users (admin, teachers)
    let user = db.users.find(u => u.email === email && u.password === password);
    
    // If not found, check students
    if (!user) {
      const student = db.students.find(s => s.email === email && s.password === password);
      if (student) {
        user = {
          id: student.id,
          email: student.email,
          role: 'student',
          name: student.name
        };
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token (simple for demo)
    const token = `token_${uuidv4()}_${Date.now()}`;

    // Get additional data based on role
    let additionalData = {};
    
    if (user.role === 'student') {
      const student = db.students.find(s => s.id === user.id);
      const dept = db.departments.find(d => d.id === student?.departmentId);
      additionalData = {
        rollNumber: student?.rollNumber,
        semester: student?.semester,
        department: dept?.name || 'Unknown',
        departmentId: student?.departmentId,
        cgpa: student?.cgpa,
        section: student?.section
      };
    } else if (user.role === 'teacher') {
      const teacher = db.teachers.find(t => t.id === user.id);
      const dept = db.departments.find(d => d.id === teacher?.departmentId);
      additionalData = {
        designation: teacher?.designation,
        department: dept?.name || 'Unknown',
        departmentId: teacher?.departmentId,
        subjects: teacher?.subjects?.length || 0
      };
    } else if (user.role === 'admin') {
      additionalData = {
        designation: 'Administrator',
        permissions: ['all']
      };
    }

    // Log activity
    db.activityLog.push({
      id: uuidv4(),
      userId: user.id,
      action: 'login',
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        ...additionalData
      }
    });
  });

  // Get user profile
  router.get('/me/:userId', (req, res) => {
    const { userId } = req.params;

    // Check admin/teachers
    let user = db.users.find(u => u.id === userId);
    
    if (user) {
      if (user.role === 'teacher') {
        const teacher = db.teachers.find(t => t.id === userId);
        const dept = db.departments.find(d => d.id === teacher?.departmentId);
        const subjectDetails = teacher?.subjects.map(sId => db.subjects.find(s => s.id === sId)).filter(Boolean);
        
        return res.json({
          ...user,
          password: undefined,
          designation: teacher?.designation,
          department: dept?.name,
          departmentId: teacher?.departmentId,
          specialization: teacher?.specialization,
          qualification: teacher?.qualification,
          phone: teacher?.phone,
          subjects: subjectDetails
        });
      }
      
      return res.json({
        ...user,
        password: undefined
      });
    }

    // Check students
    const student = db.students.find(s => s.id === userId);
    if (student) {
      const dept = db.departments.find(d => d.id === student.departmentId);
      const feeRecord = db.feePayments.find(f => f.studentId === student.id);
      
      return res.json({
        id: student.id,
        email: student.email,
        name: student.name,
        role: 'student',
        rollNumber: student.rollNumber,
        semester: student.semester,
        section: student.section,
        department: dept?.name || 'Unknown',
        departmentId: student.departmentId,
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
        feeStatus: feeRecord?.status || 'unknown',
        avatar: student.avatar
      });
    }

    return res.status(404).json({ error: 'User not found' });
  });

  // Update profile
  router.put('/profile/:userId', (req, res) => {
    const { userId } = req.params;
    const updates = req.body;

    // Remove sensitive fields
    delete updates.id;
    delete updates.role;
    delete updates.password;
    delete updates.createdAt;

    // Check in students
    const studentIndex = db.students.findIndex(s => s.id === userId);
    if (studentIndex !== -1) {
      db.students[studentIndex] = {
        ...db.students[studentIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      return res.json({
        success: true,
        message: 'Profile updated successfully',
        user: { ...db.students[studentIndex], password: undefined }
      });
    }

    // Check in teachers
    const teacherIndex = db.teachers.findIndex(t => t.id === userId);
    if (teacherIndex !== -1) {
      db.teachers[teacherIndex] = {
        ...db.teachers[teacherIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Update in users too
      const userIndex = db.users.findIndex(u => u.id === userId);
      if (userIndex !== -1 && updates.name) {
        db.users[userIndex].name = updates.name;
      }

      return res.json({
        success: true,
        message: 'Profile updated successfully',
        user: { ...db.teachers[teacherIndex], password: undefined }
      });
    }

    return res.status(404).json({ error: 'User not found' });
  });

  // Change password
  router.post('/change-password', (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check in users
    const userIndex = db.users.findIndex(u => u.id === userId && u.password === currentPassword);
    if (userIndex !== -1) {
      db.users[userIndex].password = newPassword;
      
      // Also update in teachers if applicable
      const teacherIndex = db.teachers.findIndex(t => t.id === userId);
      if (teacherIndex !== -1) {
        db.teachers[teacherIndex].password = newPassword;
      }

      return res.json({ success: true, message: 'Password changed successfully' });
    }

    // Check in students
    const studentIndex = db.students.findIndex(s => s.id === userId && s.password === currentPassword);
    if (studentIndex !== -1) {
      db.students[studentIndex].password = newPassword;
      return res.json({ success: true, message: 'Password changed successfully' });
    }

    return res.status(401).json({ error: 'Current password is incorrect' });
  });

  // Logout (log activity)
  router.post('/logout', (req, res) => {
    const { userId } = req.body;

    if (userId) {
      db.activityLog.push({
        id: uuidv4(),
        userId,
        action: 'logout',
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, message: 'Logged out successfully' });
  });

  // Get notifications
  router.get('/notifications/:userId', (req, res) => {
    const notifications = db.notifications
      .filter(n => n.userId === req.params.userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      notifications,
      unreadCount: notifications.filter(n => !n.isRead).length
    });
  });

  // Mark notification as read
  router.put('/notifications/:id/read', (req, res) => {
    const notifIndex = db.notifications.findIndex(n => n.id === req.params.id);
    if (notifIndex !== -1) {
      db.notifications[notifIndex].isRead = true;
    }
    res.json({ success: true });
  });

  // Mark all notifications as read
  router.put('/notifications/read-all/:userId', (req, res) => {
    db.notifications.forEach(n => {
      if (n.userId === req.params.userId) {
        n.isRead = true;
      }
    });
    res.json({ success: true, message: 'All notifications marked as read' });
  });

  return router;
};
