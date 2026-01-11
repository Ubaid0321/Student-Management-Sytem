const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  // Get comprehensive analytics
  router.get('/', (req, res) => {
    const { startDate, endDate } = req.query;

    // Student stats by department
    const studentsByDepartment = db.departments.map(dept => {
      const count = db.students.filter(s => s.departmentId === dept.id).length;
      return {
        department: dept.name,
        departmentCode: dept.code,
        count,
        color: dept.color
      };
    });

    // Student stats by gender
    const maleCount = db.students.filter(s => s.gender === 'Male').length;
    const femaleCount = db.students.filter(s => s.gender === 'Female').length;

    // Attendance trends (last 7 days)
    const attendanceTrends = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      const dateStr = date.toISOString().split('T')[0];
      const dayRecords = db.attendance.filter(a => a.date === dateStr);
      
      const present = dayRecords.filter(a => a.status === 'present').length;
      const absent = dayRecords.filter(a => a.status === 'absent').length;
      const late = dayRecords.filter(a => a.status === 'late').length;
      
      attendanceTrends.push({
        date: dateStr,
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        present,
        absent,
        late,
        total: present + absent + late,
        percentage: present + absent + late > 0 ? 
          ((present / (present + absent + late)) * 100).toFixed(1) : 0
      });
    }

    // Performance distribution
    const gradeDistribution = {
      'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0
    };
    
    db.marks.forEach(mark => {
      if (gradeDistribution.hasOwnProperty(mark.grade)) {
        gradeDistribution[mark.grade]++;
      }
    });

    // Fee collection status
    const feeStats = {
      totalDue: db.feePayments.reduce((sum, f) => sum + f.totalAmount, 0),
      totalCollected: db.feePayments.reduce((sum, f) => sum + f.paidAmount, 0),
      paidStudents: db.feePayments.filter(f => f.status === 'paid').length,
      pendingStudents: db.feePayments.filter(f => f.status === 'pending').length,
      partialStudents: db.feePayments.filter(f => f.status === 'partial').length
    };
    feeStats.collectionRate = ((feeStats.totalCollected / feeStats.totalDue) * 100).toFixed(1);

    // Subject-wise average marks
    const subjectPerformance = db.subjects.slice(0, 6).map(subject => {
      const subjectMarks = db.marks.filter(m => m.subjectId === subject.id && m.examType === 'midterm');
      const totalMarks = subjectMarks.reduce((sum, m) => sum + parseFloat(m.percentage), 0);
      const avg = subjectMarks.length > 0 ? (totalMarks / subjectMarks.length).toFixed(1) : 0;
      
      return {
        subject: subject.code,
        subjectName: subject.name,
        averagePercentage: parseFloat(avg),
        totalStudents: subjectMarks.length
      };
    });

    // Semester-wise student count
    const studentsBySemester = {};
    for (let i = 1; i <= 8; i++) {
      studentsBySemester[i] = db.students.filter(s => s.semester === i).length;
    }

    // Top performers
    const topPerformers = db.students
      .filter(s => s.cgpa)
      .sort((a, b) => parseFloat(b.cgpa) - parseFloat(a.cgpa))
      .slice(0, 5)
      .map(s => ({
        name: s.name,
        rollNumber: s.rollNumber,
        cgpa: s.cgpa,
        semester: s.semester
      }));

    // Low attendance students (below 75%)
    const lowAttendance = [];
    db.students.forEach(student => {
      const records = db.attendance.filter(a => a.studentId === student.id);
      const present = records.filter(a => a.status === 'present').length;
      const percentage = records.length > 0 ? (present / records.length) * 100 : 0;
      
      if (percentage < 75 && records.length > 0) {
        lowAttendance.push({
          name: student.name,
          rollNumber: student.rollNumber,
          percentage: percentage.toFixed(1),
          totalDays: records.length,
          presentDays: present
        });
      }
    });

    res.json({
      overview: {
        totalStudents: db.students.length,
        totalTeachers: db.teachers.length,
        totalSubjects: db.subjects.length,
        totalDepartments: db.departments.length,
        activeAnnouncements: db.announcements.filter(a => {
          const today = new Date().toISOString().split('T')[0];
          return !a.expiresAt || a.expiresAt >= today;
        }).length
      },
      studentsByDepartment,
      genderDistribution: {
        male: maleCount,
        female: femaleCount,
        malePercentage: ((maleCount / db.students.length) * 100).toFixed(1),
        femalePercentage: ((femaleCount / db.students.length) * 100).toFixed(1)
      },
      studentsBySemester,
      attendanceTrends,
      gradeDistribution,
      feeStats,
      subjectPerformance,
      topPerformers,
      lowAttendance: lowAttendance.sort((a, b) => a.percentage - b.percentage).slice(0, 10)
    });
  });

  // Get student performance analytics
  router.get('/student/:studentId', (req, res) => {
    const student = db.students.find(s => s.id === req.params.studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Attendance summary
    const attendance = db.attendance.filter(a => a.studentId === student.id);
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    const leave = attendance.filter(a => a.status === 'leave').length;

    // Marks by subject
    const marksBySubject = {};
    db.marks.filter(m => m.studentId === student.id).forEach(mark => {
      const subject = db.subjects.find(s => s.id === mark.subjectId);
      if (!marksBySubject[mark.subjectId]) {
        marksBySubject[mark.subjectId] = {
          subjectName: subject ? subject.name : 'Unknown',
          subjectCode: subject ? subject.code : '',
          exams: []
        };
      }
      marksBySubject[mark.subjectId].exams.push({
        type: mark.examType,
        obtained: mark.obtainedMarks,
        max: mark.maxMarks,
        percentage: mark.percentage,
        grade: mark.grade
      });
    });

    // Calculate subject totals
    Object.values(marksBySubject).forEach(subject => {
      const totalObtained = subject.exams.reduce((sum, e) => sum + e.obtained, 0);
      const totalMax = subject.exams.reduce((sum, e) => sum + e.max, 0);
      subject.totalObtained = totalObtained;
      subject.totalMax = totalMax;
      subject.percentage = ((totalObtained / totalMax) * 100).toFixed(1);
      subject.grade = calculateGrade(subject.percentage);
    });

    // Fee status
    const feeRecord = db.feePayments.find(f => f.studentId === student.id);

    // Monthly attendance trend
    const monthlyAttendance = {};
    attendance.forEach(a => {
      const month = a.date.substring(0, 7);
      if (!monthlyAttendance[month]) {
        monthlyAttendance[month] = { present: 0, absent: 0, total: 0 };
      }
      monthlyAttendance[month].total++;
      if (a.status === 'present') monthlyAttendance[month].present++;
      if (a.status === 'absent') monthlyAttendance[month].absent++;
    });

    res.json({
      student: {
        name: student.name,
        rollNumber: student.rollNumber,
        semester: student.semester,
        cgpa: student.cgpa
      },
      attendance: {
        total: attendance.length,
        present,
        absent,
        late,
        leave,
        percentage: attendance.length > 0 ? ((present / attendance.length) * 100).toFixed(1) : 0
      },
      monthlyAttendance,
      academics: {
        subjects: Object.values(marksBySubject),
        cgpa: student.cgpa
      },
      fees: feeRecord ? {
        totalDue: feeRecord.totalAmount,
        paid: feeRecord.paidAmount,
        balance: feeRecord.totalAmount - feeRecord.paidAmount,
        status: feeRecord.status
      } : null
    });
  });

  // Helper function
  function calculateGrade(percentage) {
    const p = parseFloat(percentage);
    if (p >= 90) return 'A+';
    if (p >= 80) return 'A';
    if (p >= 70) return 'B';
    if (p >= 60) return 'C';
    if (p >= 50) return 'D';
    return 'F';
  }

  return router;
};

