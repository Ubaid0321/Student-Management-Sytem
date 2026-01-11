const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  // Get comprehensive dashboard stats
  router.get('/stats', (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    // Basic counts
    const totalStudents = db.students.length;
    const totalTeachers = db.teachers.length;
    const totalSubjects = db.subjects.length;
    const totalDepartments = db.departments.length;

    // Active students (status = active)
    const activeStudents = db.students.filter(s => s.status === 'active').length;

    // Today's attendance
    const todayAttendance = db.attendance.filter(a => a.date === today);
    const presentToday = todayAttendance.filter(a => a.status === 'present').length;
    const absentToday = todayAttendance.filter(a => a.status === 'absent').length;
    const lateToday = todayAttendance.filter(a => a.status === 'late').length;

    // Overall attendance (last 30 days)
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const last30DaysStr = last30Days.toISOString().split('T')[0];
    
    const recentAttendance = db.attendance.filter(a => a.date >= last30DaysStr);
    const overallPresent = recentAttendance.filter(a => a.status === 'present').length;
    const overallAttendanceRate = recentAttendance.length > 0 
      ? ((overallPresent / recentAttendance.length) * 100).toFixed(1) 
      : 0;

    // Fee collection
    const totalFeesDue = db.feePayments.reduce((sum, f) => sum + f.totalAmount, 0);
    const totalFeesCollected = db.feePayments.reduce((sum, f) => sum + f.paidAmount, 0);
    const feeDefaulters = db.feePayments.filter(f => f.status === 'pending' && f.dueDate < today).length;

    // Students by department
    const studentsByDepartment = db.departments.map(dept => ({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      count: db.students.filter(s => s.departmentId === dept.id).length,
      color: dept.color
    }));

    // Recent announcements
    const recentAnnouncements = db.announcements
      .filter(a => !a.expiresAt || a.expiresAt >= today)
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        title: a.title,
        type: a.type,
        priority: a.priority,
        createdAt: a.createdAt
      }));

    // Upcoming exams
    const upcomingExams = db.examSchedule
      .filter(e => e.date >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5)
      .map(exam => {
        const subject = db.subjects.find(s => s.id === exam.subjectId);
        return {
          ...exam,
          subjectName: subject ? subject.name : 'Unknown',
          subjectCode: subject ? subject.code : ''
        };
      });

    // Gender distribution
    const maleStudents = db.students.filter(s => s.gender === 'Male').length;
    const femaleStudents = db.students.filter(s => s.gender === 'Female').length;

    // Recent activities
    const recentActivities = [
      { type: 'student', message: `${totalStudents} students enrolled`, time: 'Current' },
      { type: 'attendance', message: `${presentToday} present today`, time: 'Today' },
      { type: 'fee', message: `Rs. ${totalFeesCollected.toLocaleString()} collected`, time: 'This semester' }
    ];

    // Performance summary
    const avgCGPA = db.students.reduce((sum, s) => sum + parseFloat(s.cgpa || 0), 0) / db.students.length;

    res.json({
      overview: {
        totalStudents,
        activeStudents,
        totalTeachers,
        totalSubjects,
        totalDepartments,
        avgCGPA: avgCGPA.toFixed(2)
      },
      attendance: {
        today: {
          present: presentToday,
          absent: absentToday,
          late: lateToday,
          total: todayAttendance.length,
          percentage: todayAttendance.length > 0 
            ? ((presentToday / todayAttendance.length) * 100).toFixed(1) 
            : 0
        },
        overall: {
          rate: overallAttendanceRate,
          totalRecords: recentAttendance.length
        }
      },
      fees: {
        totalDue: totalFeesDue,
        totalCollected: totalFeesCollected,
        pendingAmount: totalFeesDue - totalFeesCollected,
        collectionRate: totalFeesDue > 0 ? ((totalFeesCollected / totalFeesDue) * 100).toFixed(1) : 0,
        defaulters: feeDefaulters
      },
      demographics: {
        studentsByDepartment,
        genderDistribution: {
          male: maleStudents,
          female: femaleStudents,
          malePercentage: ((maleStudents / totalStudents) * 100).toFixed(1),
          femalePercentage: ((femaleStudents / totalStudents) * 100).toFixed(1)
        }
      },
      recentAnnouncements,
      upcomingExams,
      recentActivities,
      timestamp: new Date().toISOString()
    });
  });

  // Quick stats for cards
  router.get('/quick-stats', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = db.attendance.filter(a => a.date === today);
    const presentToday = todayAttendance.filter(a => a.status === 'present').length;

    res.json({
      students: db.students.length,
      teachers: db.teachers.length,
      presentToday,
      announcements: db.announcements.filter(a => !a.expiresAt || a.expiresAt >= today).length
    });
  });

  // Get student dashboard
  router.get('/student/:studentId', (req, res) => {
    const student = db.students.find(s => s.id === req.params.studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Attendance
    const attendance = db.attendance.filter(a => a.studentId === student.id);
    const present = attendance.filter(a => a.status === 'present').length;
    const attendancePercentage = attendance.length > 0 
      ? ((present / attendance.length) * 100).toFixed(1) 
      : 0;

    // Marks
    const marks = db.marks.filter(m => m.studentId === student.id);
    const totalObtained = marks.reduce((sum, m) => sum + m.obtainedMarks, 0);
    const totalMax = marks.reduce((sum, m) => sum + m.maxMarks, 0);
    const overallPercentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : 0;

    // Fee status
    const feeRecord = db.feePayments.find(f => f.studentId === student.id);

    // Timetable for today
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDay = dayNames[new Date().getDay()];
    const todayClasses = db.timetable
      .filter(t => t.day === todayDay && t.departmentId === student.departmentId && t.semester === student.semester)
      .map(slot => {
        const subject = db.subjects.find(s => s.id === slot.subjectId);
        return {
          ...slot,
          subjectName: subject ? subject.name : 'Unknown'
        };
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Announcements
    const announcements = db.announcements
      .filter(a => (!a.expiresAt || a.expiresAt >= today) && 
                   (a.targetAudience === 'all' || a.targetAudience === 'students'))
      .slice(0, 3);

    // Upcoming exams
    const upcomingExams = db.examSchedule
      .filter(e => e.date >= today)
      .slice(0, 3)
      .map(exam => {
        const subject = db.subjects.find(s => s.id === exam.subjectId);
        return {
          ...exam,
          subjectName: subject ? subject.name : 'Unknown'
        };
      });

    res.json({
      student: {
        name: student.name,
        rollNumber: student.rollNumber,
        semester: student.semester,
        cgpa: student.cgpa,
        department: db.departments.find(d => d.id === student.departmentId)?.name || 'Unknown'
      },
      attendance: {
        percentage: attendancePercentage,
        totalDays: attendance.length,
        presentDays: present
      },
      academics: {
        percentage: overallPercentage,
        cgpa: student.cgpa,
        subjects: marks.length
      },
      fees: feeRecord ? {
        status: feeRecord.status,
        balance: feeRecord.totalAmount - feeRecord.paidAmount
      } : null,
      todayClasses,
      announcements,
      upcomingExams
    });
  });

  return router;
};
