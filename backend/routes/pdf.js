const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  // Generate Student Details PDF
  router.get('/student/:studentId', (req, res) => {
    const student = db.students.find(s => s.id === req.params.studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const dept = db.departments.find(d => d.id === student.departmentId);
    const feeRecord = db.feePayments.find(f => f.studentId === student.id);

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Student Profile - ${student.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { font-size: 24px; margin-bottom: 5px; }
        .header p { opacity: 0.9; font-size: 14px; }
        .logo { font-size: 32px; margin-bottom: 10px; }
        .content { padding: 30px; }
        .profile-section { display: flex; gap: 30px; margin-bottom: 30px; padding-bottom: 30px; border-bottom: 2px solid #e2e8f0; }
        .avatar { width: 120px; height: 120px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 48px; font-weight: bold; }
        .basic-info h2 { color: #1a365d; font-size: 28px; margin-bottom: 5px; }
        .basic-info .roll { color: #718096; font-size: 16px; margin-bottom: 10px; }
        .badge { display: inline-block; padding: 4px 12px; background: #48bb78; color: white; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
        .info-item { padding: 15px; background: #f7fafc; border-radius: 8px; border-left: 4px solid #1a365d; }
        .info-item label { display: block; color: #718096; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
        .info-item span { color: #1a202c; font-size: 16px; font-weight: 500; }
        .section-title { color: #1a365d; font-size: 18px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
        .stat-card { text-align: center; padding: 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border-radius: 10px; }
        .stat-card.blue { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .stat-card.green { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
        .stat-card .value { font-size: 32px; font-weight: bold; }
        .stat-card .label { font-size: 12px; opacity: 0.9; text-transform: uppercase; }
        .footer { text-align: center; padding: 20px; background: #f7fafc; color: #718096; font-size: 12px; }
        @media print { body { background: white; padding: 0; } .container { box-shadow: none; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎓</div>
          <h1>The Islamia University of Bahawalpur</h1>
          <p>Student Management System - Official Document</p>
        </div>
        <div class="content">
          <div class="profile-section">
            <div class="avatar">${student.name.charAt(0)}</div>
            <div class="basic-info">
              <h2>${student.name}</h2>
              <p class="roll">${student.rollNumber}</p>
              <span class="badge">${student.status?.toUpperCase() || 'ACTIVE'}</span>
            </div>
          </div>
          
          <h3 class="section-title">📊 Academic Overview</h3>
          <div class="stats-grid">
            <div class="stat-card blue">
              <div class="value">${student.cgpa || 'N/A'}</div>
              <div class="label">CGPA</div>
            </div>
            <div class="stat-card green">
              <div class="value">${student.semester}</div>
              <div class="label">Semester</div>
            </div>
            <div class="stat-card">
              <div class="value">${feeRecord?.status === 'paid' ? '✓' : '⚠'}</div>
              <div class="label">Fee Status</div>
            </div>
          </div>

          <h3 class="section-title">📋 Personal Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Department</label>
              <span>${dept?.name || 'Not Assigned'}</span>
            </div>
            <div class="info-item">
              <label>Section</label>
              <span>${student.section || 'A'}</span>
            </div>
            <div class="info-item">
              <label>Email</label>
              <span>${student.email}</span>
            </div>
            <div class="info-item">
              <label>Phone</label>
              <span>${student.phone || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Date of Birth</label>
              <span>${student.dateOfBirth || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Gender</label>
              <span>${student.gender || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Blood Group</label>
              <span>${student.bloodGroup || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Admission Date</label>
              <span>${student.admissionDate || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Guardian Name</label>
              <span>${student.guardianName || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Guardian Phone</label>
              <span>${student.guardianPhone || 'N/A'}</span>
            </div>
          </div>

          <h3 class="section-title">📍 Address</h3>
          <div class="info-item" style="margin-bottom: 30px;">
            <span>${student.address || 'Not provided'}</span>
          </div>
        </div>
        <div class="footer">
          Generated on ${new Date().toLocaleString()} | IUB Student Management System
        </div>
      </div>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // Generate Attendance Report PDF
  router.get('/attendance/:studentId', (req, res) => {
    const { startDate, endDate } = req.query;
    const student = db.students.find(s => s.id === req.params.studentId);
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    let records = db.attendance.filter(a => a.studentId === student.id);
    
    if (startDate && endDate) {
      records = records.filter(r => r.date >= startDate && r.date <= endDate);
    }

    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const leave = records.filter(r => r.status === 'leave').length;
    const percentage = records.length > 0 ? ((present / records.length) * 100).toFixed(1) : 0;

    const recordsHtml = records.slice(0, 30).map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
        <td>
          <span class="status ${r.status}">${r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span>
        </td>
        <td>${r.checkInTime || '-'}</td>
      </tr>
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Attendance Report - ${student.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; }
        .header h1 { font-size: 24px; margin-bottom: 5px; }
        .header p { opacity: 0.9; }
        .content { padding: 30px; }
        .student-info { display: flex; justify-content: space-between; padding: 20px; background: #f7fafc; border-radius: 10px; margin-bottom: 30px; }
        .student-info div { text-align: center; }
        .student-info .label { color: #718096; font-size: 12px; text-transform: uppercase; }
        .student-info .value { font-size: 18px; font-weight: 600; color: #1a202c; }
        .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 30px; }
        .stat { text-align: center; padding: 15px; border-radius: 10px; }
        .stat.total { background: #e2e8f0; }
        .stat.present { background: #c6f6d5; }
        .stat.absent { background: #fed7d7; }
        .stat.late { background: #feebc8; }
        .stat.leave { background: #bee3f8; }
        .stat .value { font-size: 24px; font-weight: bold; }
        .stat .label { font-size: 11px; text-transform: uppercase; color: #4a5568; }
        .percentage-bar { height: 20px; background: #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 30px; }
        .percentage-fill { height: 100%; background: linear-gradient(90deg, #48bb78, #38a169); transition: width 0.3s; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1a365d; color: white; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
        td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) { background: #f7fafc; }
        .status { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
        .status.present { background: #c6f6d5; color: #22543d; }
        .status.absent { background: #fed7d7; color: #742a2a; }
        .status.late { background: #feebc8; color: #744210; }
        .status.leave { background: #bee3f8; color: #2a4365; }
        .footer { text-align: center; padding: 20px; background: #f7fafc; color: #718096; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Attendance Report</h1>
          <p>The Islamia University of Bahawalpur</p>
        </div>
        <div class="content">
          <div class="student-info">
            <div>
              <div class="label">Student Name</div>
              <div class="value">${student.name}</div>
            </div>
            <div>
              <div class="label">Roll Number</div>
              <div class="value">${student.rollNumber}</div>
            </div>
            <div>
              <div class="label">Semester</div>
              <div class="value">${student.semester}</div>
            </div>
            <div>
              <div class="label">Period</div>
              <div class="value">${startDate || 'All'} - ${endDate || 'Time'}</div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat total">
              <div class="value">${records.length}</div>
              <div class="label">Total Days</div>
            </div>
            <div class="stat present">
              <div class="value">${present}</div>
              <div class="label">Present</div>
            </div>
            <div class="stat absent">
              <div class="value">${absent}</div>
              <div class="label">Absent</div>
            </div>
            <div class="stat late">
              <div class="value">${late}</div>
              <div class="label">Late</div>
            </div>
            <div class="stat leave">
              <div class="value">${leave}</div>
              <div class="label">Leave</div>
            </div>
          </div>

          <p style="text-align: center; margin-bottom: 10px; font-weight: 600;">Attendance Rate: ${percentage}%</p>
          <div class="percentage-bar">
            <div class="percentage-fill" style="width: ${percentage}%"></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Status</th>
                <th>Check-in</th>
              </tr>
            </thead>
            <tbody>
              ${recordsHtml || '<tr><td colspan="4" style="text-align:center">No records found</td></tr>'}
            </tbody>
          </table>
        </div>
        <div class="footer">
          Generated on ${new Date().toLocaleString()} | IUB Student Management System
        </div>
      </div>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // Generate Result Card PDF
  router.get('/result/:studentId', (req, res) => {
    const { examType } = req.query;
    const student = db.students.find(s => s.id === req.params.studentId);
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const dept = db.departments.find(d => d.id === student.departmentId);
    let marks = db.marks.filter(m => m.studentId === student.id);
    
    if (examType) {
      marks = marks.filter(m => m.examType === examType);
    }

    // Group by subject
    const subjectResults = {};
    marks.forEach(m => {
      const subject = db.subjects.find(s => s.id === m.subjectId);
      if (!subjectResults[m.subjectId]) {
        subjectResults[m.subjectId] = {
          name: subject?.name || 'Unknown',
          code: subject?.code || '',
          creditHours: subject?.creditHours || 3,
          exams: []
        };
      }
      subjectResults[m.subjectId].exams.push(m);
    });

    // Calculate totals
    let totalCredits = 0;
    let totalGradePoints = 0;

    const resultsHtml = Object.values(subjectResults).map((subject, i) => {
      const totalObtained = subject.exams.reduce((sum, e) => sum + e.obtainedMarks, 0);
      const totalMax = subject.exams.reduce((sum, e) => sum + e.maxMarks, 0);
      const percentage = ((totalObtained / totalMax) * 100).toFixed(1);
      
      let grade, gpa;
      const p = parseFloat(percentage);
      if (p >= 90) { grade = 'A+'; gpa = 4.0; }
      else if (p >= 85) { grade = 'A'; gpa = 4.0; }
      else if (p >= 80) { grade = 'A-'; gpa = 3.7; }
      else if (p >= 75) { grade = 'B+'; gpa = 3.3; }
      else if (p >= 70) { grade = 'B'; gpa = 3.0; }
      else if (p >= 65) { grade = 'B-'; gpa = 2.7; }
      else if (p >= 60) { grade = 'C+'; gpa = 2.3; }
      else if (p >= 55) { grade = 'C'; gpa = 2.0; }
      else if (p >= 50) { grade = 'C-'; gpa = 1.7; }
      else if (p >= 45) { grade = 'D'; gpa = 1.0; }
      else { grade = 'F'; gpa = 0.0; }

      totalCredits += subject.creditHours;
      totalGradePoints += gpa * subject.creditHours;

      return `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${subject.code}</strong><br><small>${subject.name}</small></td>
          <td style="text-align:center">${subject.creditHours}</td>
          <td style="text-align:center">${totalMax}</td>
          <td style="text-align:center">${totalObtained}</td>
          <td style="text-align:center">${percentage}%</td>
          <td style="text-align:center"><span class="grade ${grade.replace('+', 'plus').replace('-', 'minus')}">${grade}</span></td>
          <td style="text-align:center">${gpa.toFixed(1)}</td>
        </tr>
      `;
    }).join('');

    const cgpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : 0;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Result Card - ${student.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', serif; padding: 40px; background: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: white; border: 3px solid #1a365d; }
        .header { background: #1a365d; color: white; padding: 25px; text-align: center; }
        .header h1 { font-size: 26px; margin-bottom: 5px; letter-spacing: 2px; }
        .header h2 { font-size: 18px; font-weight: normal; opacity: 0.9; }
        .sub-header { background: #d4a017; color: #1a365d; padding: 10px; text-align: center; font-size: 14px; font-weight: bold; letter-spacing: 1px; }
        .content { padding: 30px; }
        .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; padding: 20px; border: 1px solid #e2e8f0; }
        .info-row { display: flex; }
        .info-row .label { font-weight: bold; color: #4a5568; min-width: 120px; }
        .info-row .value { color: #1a202c; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background: #2d4a7c; color: white; padding: 12px 8px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 12px 8px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        tr:nth-child(even) { background: #f7fafc; }
        .grade { padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
        .grade.Aplus, .grade.A { background: #c6f6d5; color: #22543d; }
        .grade.Aminus, .grade.Bplus, .grade.B { background: #bee3f8; color: #2a4365; }
        .grade.Bminus, .grade.Cplus, .grade.C { background: #feebc8; color: #744210; }
        .grade.Cminus, .grade.D { background: #fed7d7; color: #742a2a; }
        .grade.F { background: #742a2a; color: white; }
        .summary { display: flex; justify-content: space-around; padding: 20px; background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%); color: white; border-radius: 10px; margin-bottom: 30px; }
        .summary-item { text-align: center; }
        .summary-item .value { font-size: 32px; font-weight: bold; }
        .summary-item .label { font-size: 12px; opacity: 0.9; text-transform: uppercase; }
        .cgpa-highlight { background: #d4a017; color: #1a365d; padding: 10px 30px; border-radius: 50px; }
        .signature-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 50px; padding-top: 30px; border-top: 2px solid #e2e8f0; }
        .signature { text-align: center; }
        .signature-line { border-top: 1px solid #1a202c; margin-top: 50px; padding-top: 10px; font-size: 12px; color: #4a5568; }
        .footer { text-align: center; padding: 15px; background: #f7fafc; color: #718096; font-size: 11px; border-top: 1px solid #e2e8f0; }
        @media print { body { padding: 0; background: white; } .container { border: 2px solid #1a365d; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>THE ISLAMIA UNIVERSITY OF BAHAWALPUR</h1>
          <h2>Official Result Card</h2>
        </div>
        <div class="sub-header">
          ${examType ? examType.toUpperCase() + ' EXAMINATION' : 'SEMESTER EXAMINATION'} - FALL 2025
        </div>
        <div class="content">
          <div class="student-info">
            <div class="info-row">
              <span class="label">Student Name:</span>
              <span class="value">${student.name}</span>
            </div>
            <div class="info-row">
              <span class="label">Roll Number:</span>
              <span class="value">${student.rollNumber}</span>
            </div>
            <div class="info-row">
              <span class="label">Department:</span>
              <span class="value">${dept?.name || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Semester:</span>
              <span class="value">${student.semester}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Subject</th>
                <th style="text-align:center">Cr. Hrs</th>
                <th style="text-align:center">Max</th>
                <th style="text-align:center">Obtained</th>
                <th style="text-align:center">%</th>
                <th style="text-align:center">Grade</th>
                <th style="text-align:center">GPA</th>
              </tr>
            </thead>
            <tbody>
              ${resultsHtml || '<tr><td colspan="8" style="text-align:center">No results found</td></tr>'}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-item">
              <div class="value">${Object.keys(subjectResults).length}</div>
              <div class="label">Subjects</div>
            </div>
            <div class="summary-item">
              <div class="value">${totalCredits}</div>
              <div class="label">Credit Hours</div>
            </div>
            <div class="summary-item cgpa-highlight">
              <div class="value">${cgpa}</div>
              <div class="label">CGPA</div>
            </div>
            <div class="summary-item">
              <div class="value">${cgpa >= 2.0 ? 'PASS' : 'FAIL'}</div>
              <div class="label">Status</div>
            </div>
          </div>

          <div class="signature-section">
            <div class="signature">
              <div class="signature-line">Controller of Examinations</div>
            </div>
            <div class="signature">
              <div class="signature-line">Department Head</div>
            </div>
            <div class="signature">
              <div class="signature-line">Dean's Signature</div>
            </div>
          </div>
        </div>
        <div class="footer">
          This is a computer-generated document. Generated on ${new Date().toLocaleString()} | IUB Student Management System v2.0
        </div>
      </div>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // Generate Fee Receipt
  router.get('/fee-receipt/:paymentId', (req, res) => {
    const feeRecord = db.feePayments.find(f => f.id === req.params.paymentId);
    if (!feeRecord) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    const student = db.students.find(s => s.id === feeRecord.studentId);
    const semester = db.semesters.find(s => s.id === feeRecord.semesterId);

    const paymentsHtml = feeRecord.payments.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${p.receiptNo}</td>
        <td>${new Date(p.date).toLocaleDateString()}</td>
        <td>${p.method}</td>
        <td style="text-align:right">Rs. ${p.amount.toLocaleString()}</td>
      </tr>
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Fee Receipt - ${student?.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { font-size: 22px; margin-bottom: 5px; }
        .content { padding: 30px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; }
        .info-item { }
        .info-item .label { color: #718096; font-size: 12px; text-transform: uppercase; }
        .info-item .value { color: #1a202c; font-size: 16px; font-weight: 500; }
        .amount-section { background: #f7fafc; padding: 20px; border-radius: 10px; margin-bottom: 25px; }
        .amount-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .amount-row:last-child { border-bottom: none; font-weight: bold; font-size: 18px; color: #1a365d; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        th { background: #1a365d; color: white; padding: 10px; text-align: left; font-size: 12px; }
        td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        .status { display: inline-block; padding: 8px 20px; border-radius: 20px; font-weight: bold; text-transform: uppercase; font-size: 14px; }
        .status.paid { background: #c6f6d5; color: #22543d; }
        .status.partial { background: #feebc8; color: #744210; }
        .status.pending { background: #fed7d7; color: #742a2a; }
        .footer { text-align: center; padding: 20px; background: #f7fafc; color: #718096; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💳 Fee Receipt</h1>
          <p>The Islamia University of Bahawalpur</p>
        </div>
        <div class="content">
          <div class="info-grid">
            <div class="info-item">
              <div class="label">Student Name</div>
              <div class="value">${student?.name || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="label">Roll Number</div>
              <div class="value">${student?.rollNumber || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="label">Semester</div>
              <div class="value">${semester?.name || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="label">Due Date</div>
              <div class="value">${feeRecord.dueDate}</div>
            </div>
          </div>

          <div class="amount-section">
            <div class="amount-row">
              <span>Total Fee</span>
              <span>Rs. ${feeRecord.totalAmount.toLocaleString()}</span>
            </div>
            <div class="amount-row">
              <span>Paid Amount</span>
              <span>Rs. ${feeRecord.paidAmount.toLocaleString()}</span>
            </div>
            <div class="amount-row">
              <span>Balance</span>
              <span>Rs. ${(feeRecord.totalAmount - feeRecord.paidAmount).toLocaleString()}</span>
            </div>
          </div>

          <p style="text-align:center; margin-bottom: 20px;">
            <span class="status ${feeRecord.status}">${feeRecord.status}</span>
          </p>

          ${feeRecord.payments.length > 0 ? `
            <h4 style="margin-bottom: 15px; color: #1a365d;">Payment History</h4>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Receipt No</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th style="text-align:right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${paymentsHtml}
              </tbody>
            </table>
          ` : ''}
        </div>
        <div class="footer">
          Generated on ${new Date().toLocaleString()} | IUB Student Management System
        </div>
      </div>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  return router;
};
