require('dotenv').config();
const express = require('express');
const cors = require('cors');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Get local IP address
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

// ============================================
// COMPREHENSIVE DATABASE SCHEMA v3.0
// ============================================
let db = {
  users: [],
  students: [],
  teachers: [],
  courses: [],
  classes: [],
  subjects: [],
  attendance: [],
  marks: [],
  fees: [],
  feePayments: [],
  announcements: [],
  timetable: [],
  semesters: [],
  departments: [],
  examSchedule: [],
  assignments: [],
  submissions: [],        // NEW: Assignment submissions
  notifications: [],
  activityLog: [],
  leaveApplications: [],  // NEW: Student leave requests
  qrSessions: [],         // NEW: QR attendance sessions
  enrollments: [],        // NEW: Course enrollments
  courseOfferings: [],    // NEW: Semester course offerings
  feedback: [],           // NEW: Student feedback
  complaints: []          // NEW: Complaints system
};

// ============================================
// INITIALIZE DEFAULT DATA
// ============================================

// Default Admin
db.users.push({
  id: 'admin-001',
  email: 'admin@iub.edu.pk',
  password: 'admin123',
  role: 'admin',
  name: 'Dr. Muhammad Ali',
  phone: '+92-300-1234567',
  avatar: null,
  designation: 'Principal',
  createdAt: new Date().toISOString()
});

// Departments
db.departments = [
  { id: 'dept-001', name: 'Computer Science', code: 'CS', head: 'Dr. Ahmed Khan', color: '#3B82F6' },
  { id: 'dept-002', name: 'Electrical Engineering', code: 'EE', head: 'Dr. Sara Malik', color: '#10B981' },
  { id: 'dept-003', name: 'Business Administration', code: 'BBA', head: 'Dr. Fatima Shah', color: '#F59E0B' },
  { id: 'dept-004', name: 'Mathematics', code: 'MATH', head: 'Prof. Imran Hussain', color: '#8B5CF6' },
  { id: 'dept-005', name: 'Physics', code: 'PHY', head: 'Dr. Aisha Raza', color: '#EC4899' }
];

// Semesters
db.semesters = [
  { id: 'sem-001', name: 'Fall 2025', startDate: '2025-09-01', endDate: '2025-12-31', isActive: true },
  { id: 'sem-002', name: 'Spring 2026', startDate: '2026-02-01', endDate: '2026-05-31', isActive: false },
  { id: 'sem-003', name: 'Summer 2026', startDate: '2026-06-15', endDate: '2026-08-15', isActive: false }
];

// Subjects with credit hours and type
db.subjects = [
  { id: 'sub-001', name: 'Programming Fundamentals', code: 'CS101', creditHours: 4, type: 'core', departmentId: 'dept-001' },
  { id: 'sub-002', name: 'Data Structures', code: 'CS201', creditHours: 4, type: 'core', departmentId: 'dept-001' },
  { id: 'sub-003', name: 'Database Systems', code: 'CS301', creditHours: 3, type: 'core', departmentId: 'dept-001' },
  { id: 'sub-004', name: 'Web Development', code: 'CS302', creditHours: 3, type: 'elective', departmentId: 'dept-001' },
  { id: 'sub-005', name: 'Mobile App Development', code: 'CS401', creditHours: 3, type: 'elective', departmentId: 'dept-001' },
  { id: 'sub-006', name: 'Artificial Intelligence', code: 'CS402', creditHours: 3, type: 'elective', departmentId: 'dept-001' },
  { id: 'sub-007', name: 'Calculus I', code: 'MATH101', creditHours: 3, type: 'core', departmentId: 'dept-004' },
  { id: 'sub-008', name: 'Physics I', code: 'PHY101', creditHours: 4, type: 'core', departmentId: 'dept-005' },
  { id: 'sub-009', name: 'English Communication', code: 'ENG101', creditHours: 3, type: 'core', departmentId: null },
  { id: 'sub-010', name: 'Islamic Studies', code: 'ISL101', creditHours: 2, type: 'compulsory', departmentId: null }
];

// Sample Teachers
db.teachers = [
  {
    id: 'teacher-001',
    email: 'teacher@iub.edu.pk',
    password: 'teacher123',
    role: 'teacher',
    name: 'Prof. Hassan Ahmed',
    phone: '+92-321-7654321',
    departmentId: 'dept-001',
    designation: 'Associate Professor',
    specialization: 'Machine Learning, Data Science',
    qualification: 'PhD Computer Science',
    joinDate: '2018-01-15',
    subjects: ['sub-001', 'sub-002', 'sub-006'],
    avatar: null,
    createdAt: new Date().toISOString()
  },
  {
    id: 'teacher-002',
    email: 'fatima.khan@iub.edu.pk',
    password: 'teacher123',
    role: 'teacher',
    name: 'Dr. Fatima Khan',
    phone: '+92-333-9876543',
    departmentId: 'dept-001',
    designation: 'Assistant Professor',
    specialization: 'Web Technologies, Software Engineering',
    qualification: 'PhD Software Engineering',
    joinDate: '2020-03-01',
    subjects: ['sub-003', 'sub-004', 'sub-005'],
    avatar: null,
    createdAt: new Date().toISOString()
  }
];

// Add teachers to users for login
db.teachers.forEach(t => {
  db.users.push({
    id: t.id,
    email: t.email,
    password: t.password,
    role: 'teacher',
    name: t.name,
    createdAt: t.createdAt
  });
});

// Sample Students with more details
const sampleStudents = [
  { name: 'Ahmad Raza', rollNumber: 'IUB-2025-001', gender: 'Male', department: 'dept-001', semester: 3 },
  { name: 'Fatima Zahra', rollNumber: 'IUB-2025-002', gender: 'Female', department: 'dept-001', semester: 3 },
  { name: 'Muhammad Ali', rollNumber: 'IUB-2025-003', gender: 'Male', department: 'dept-001', semester: 5 },
  { name: 'Ayesha Siddiqui', rollNumber: 'IUB-2025-004', gender: 'Female', department: 'dept-002', semester: 1 },
  { name: 'Usman Khan', rollNumber: 'IUB-2025-005', gender: 'Male', department: 'dept-001', semester: 7 },
  { name: 'Zainab Malik', rollNumber: 'IUB-2025-006', gender: 'Female', department: 'dept-003', semester: 3 },
  { name: 'Bilal Ahmed', rollNumber: 'IUB-2025-007', gender: 'Male', department: 'dept-001', semester: 5 },
  { name: 'Maryam Hassan', rollNumber: 'IUB-2025-008', gender: 'Female', department: 'dept-004', semester: 1 }
];

sampleStudents.forEach((s, i) => {
  const studentId = `student-${String(i + 1).padStart(3, '0')}`;
  const email = s.name.toLowerCase().replace(' ', '.') + '@student.iub.edu.pk';
  
  db.students.push({
    id: studentId,
    name: s.name,
    email: email,
    password: 'student123',
    rollNumber: s.rollNumber,
    departmentId: s.department,
    semester: s.semester,
    section: 'A',
    phone: `+92-30${i}-1234567`,
    address: `House ${i + 1}, Model Town, Bahawalpur`,
    dateOfBirth: `200${3 + (i % 3)}-0${(i % 9) + 1}-${10 + i}`,
    gender: s.gender,
    guardianName: `Mr. ${s.name.split(' ')[1]}`,
    guardianPhone: `+92-31${i}-7654321`,
    bloodGroup: ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'][i % 8],
    admissionDate: '2023-09-01',
    status: 'active',
    cgpa: (2.5 + Math.random() * 1.5).toFixed(2),
    avatar: null,
    createdAt: new Date().toISOString()
  });

  // Add to users for login
  db.users.push({
    id: studentId,
    email: email,
    password: 'student123',
    role: 'student',
    name: s.name,
    createdAt: new Date().toISOString()
  });
});

// Sample Fee Structure
db.fees = [
  { id: 'fee-001', name: 'Tuition Fee', amount: 45000, type: 'semester', dueDay: 15 },
  { id: 'fee-002', name: 'Lab Fee', amount: 5000, type: 'semester', dueDay: 15 },
  { id: 'fee-003', name: 'Library Fee', amount: 2000, type: 'annual', dueDay: 1 },
  { id: 'fee-004', name: 'Sports Fee', amount: 1500, type: 'annual', dueDay: 1 },
  { id: 'fee-005', name: 'Examination Fee', amount: 3000, type: 'semester', dueDay: 30 }
];

// Generate Fee Records for Students
db.students.forEach(student => {
  const totalFee = 45000 + 5000 + 2000 + 1500 + 3000;
  const paid = Math.random() > 0.3;
  
  db.feePayments.push({
    id: `payment-${student.id}`,
    studentId: student.id,
    semesterId: 'sem-001',
    totalAmount: totalFee,
    paidAmount: paid ? totalFee : Math.floor(totalFee * Math.random()),
    dueDate: '2025-09-15',
    status: paid ? 'paid' : (Math.random() > 0.5 ? 'partial' : 'pending'),
    payments: paid ? [{
      amount: totalFee,
      date: '2025-09-10',
      method: 'Bank Transfer',
      receiptNo: `RCP-${Date.now()}-${student.id}`
    }] : [],
    createdAt: new Date().toISOString()
  });
});

// Sample Announcements
db.announcements = [
  {
    id: 'ann-001',
    title: 'Mid-Term Examinations Schedule',
    content: 'Mid-term examinations will commence from October 15, 2025. Students are advised to check the date sheet on the notice board and prepare accordingly. Best of luck!',
    type: 'exam',
    priority: 'high',
    targetAudience: 'all',
    attachments: [],
    createdBy: 'admin-001',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: '2025-10-20'
  },
  {
    id: 'ann-002',
    title: 'Fee Submission Deadline',
    content: 'Last date for fee submission is September 30, 2025. Late fee of Rs. 1000 will be charged after the deadline. Please ensure timely payment to avoid any inconvenience.',
    type: 'finance',
    priority: 'high',
    targetAudience: 'students',
    attachments: [],
    createdBy: 'admin-001',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: '2025-09-30'
  },
  {
    id: 'ann-003',
    title: 'Sports Week 2025',
    content: 'Annual Sports Week will be held from November 1-7, 2025. Students interested in participating should register at the Sports Office by October 20. Events include Cricket, Football, Badminton, and Table Tennis.',
    type: 'event',
    priority: 'medium',
    targetAudience: 'all',
    attachments: [],
    createdBy: 'admin-001',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: '2025-11-07'
  },
  {
    id: 'ann-004',
    title: 'Holiday Notice - Eid ul Fitr',
    content: 'The university will remain closed from March 28 to April 3, 2026 on account of Eid ul Fitr. Classes will resume on April 4, 2026.',
    type: 'holiday',
    priority: 'medium',
    targetAudience: 'all',
    attachments: [],
    createdBy: 'admin-001',
    createdAt: new Date().toISOString(),
    expiresAt: '2026-04-05'
  }
];

// Sample Timetable
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const timeSlots = [
  { start: '08:30', end: '10:00' },
  { start: '10:15', end: '11:45' },
  { start: '12:00', end: '13:30' },
  { start: '14:00', end: '15:30' },
  { start: '15:45', end: '17:15' }
];

days.forEach((day, dayIndex) => {
  timeSlots.forEach((slot, slotIndex) => {
    if (Math.random() > 0.3) {
      const subjectIndex = (dayIndex + slotIndex) % db.subjects.length;
      const teacherIndex = (dayIndex + slotIndex) % db.teachers.length;
      
      db.timetable.push({
        id: `tt-${dayIndex}-${slotIndex}`,
        day: day,
        startTime: slot.start,
        endTime: slot.end,
        subjectId: db.subjects[subjectIndex].id,
        teacherId: db.teachers[teacherIndex].id,
        room: `Room ${100 + slotIndex + (dayIndex * 10)}`,
        departmentId: 'dept-001',
        semester: 3,
        section: 'A',
        type: slotIndex === 2 ? 'lab' : 'lecture'
      });
    }
  });
});

// Sample Attendance Data (last 30 days)
const today = new Date();
for (let i = 30; i >= 0; i--) {
  const date = new Date(today);
  date.setDate(date.getDate() - i);
  
  // Skip weekends
  if (date.getDay() === 0 || date.getDay() === 6) continue;
  
  const dateStr = date.toISOString().split('T')[0];
  
  db.students.forEach(student => {
    const random = Math.random();
    let status = 'present';
    if (random < 0.1) status = 'absent';
    else if (random < 0.2) status = 'late';
    else if (random < 0.25) status = 'leave';
    
    db.attendance.push({
      id: `att-${dateStr}-${student.id}`,
      studentId: student.id,
      date: dateStr,
      status: status,
      checkInTime: status !== 'absent' ? '08:30' : null,
      checkOutTime: status !== 'absent' ? '15:00' : null,
      markedBy: 'teacher-001',
      markedAt: new Date().toISOString()
    });
  });
}

// Sample Marks Data
const examTypes = ['quiz1', 'quiz2', 'assignment1', 'assignment2', 'midterm', 'final'];
const maxMarks = { quiz1: 10, quiz2: 10, assignment1: 10, assignment2: 10, midterm: 30, final: 50 };

db.students.forEach(student => {
  db.subjects.slice(0, 5).forEach(subject => {
    examTypes.forEach(examType => {
      const max = maxMarks[examType];
      const obtained = Math.floor(max * (0.5 + Math.random() * 0.5));
      
      db.marks.push({
        id: `mark-${student.id}-${subject.id}-${examType}`,
        studentId: student.id,
        subjectId: subject.id,
        examType: examType,
        maxMarks: max,
        obtainedMarks: obtained,
        percentage: ((obtained / max) * 100).toFixed(2),
        grade: obtained >= max * 0.9 ? 'A+' : obtained >= max * 0.8 ? 'A' : obtained >= max * 0.7 ? 'B' : obtained >= max * 0.6 ? 'C' : obtained >= max * 0.5 ? 'D' : 'F',
        semesterId: 'sem-001',
        remarks: '',
        addedBy: 'teacher-001',
        addedAt: new Date().toISOString()
      });
    });
  });
});

// Exam Schedule
db.examSchedule = [
  { id: 'exam-001', subjectId: 'sub-001', date: '2025-10-15', startTime: '09:00', endTime: '12:00', room: 'Hall A', type: 'midterm' },
  { id: 'exam-002', subjectId: 'sub-002', date: '2025-10-16', startTime: '09:00', endTime: '12:00', room: 'Hall B', type: 'midterm' },
  { id: 'exam-003', subjectId: 'sub-003', date: '2025-10-17', startTime: '14:00', endTime: '17:00', room: 'Hall A', type: 'midterm' },
  { id: 'exam-004', subjectId: 'sub-004', date: '2025-10-18', startTime: '09:00', endTime: '12:00', room: 'Lab 1', type: 'midterm' },
  { id: 'exam-005', subjectId: 'sub-007', date: '2025-10-19', startTime: '14:00', endTime: '17:00', room: 'Hall C', type: 'midterm' }
];

// Sample Assignments
db.assignments = [
  {
    id: 'assign-001',
    title: 'Programming Fundamentals - Lab 1',
    description: 'Complete exercises 1-10 from Chapter 3. Submit your code files along with screenshots of output.',
    subjectId: 'sub-001',
    teacherId: 'teacher-001',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    totalMarks: 20,
    type: 'lab',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'assign-002',
    title: 'Data Structures - Linked List Implementation',
    description: 'Implement a doubly linked list with insert, delete, and search operations. Include time complexity analysis.',
    subjectId: 'sub-002',
    teacherId: 'teacher-001',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    totalMarks: 30,
    type: 'assignment',
    status: 'active',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'assign-003',
    title: 'Database Project - University Management System',
    description: 'Design and implement a database for university management. Include ER diagrams, normalization, and SQL queries.',
    subjectId: 'sub-003',
    teacherId: 'teacher-002',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    totalMarks: 50,
    type: 'project',
    status: 'active',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'assign-004',
    title: 'Web Development Quiz',
    description: 'Online quiz covering HTML, CSS, and JavaScript basics.',
    subjectId: 'sub-004',
    teacherId: 'teacher-002',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    totalMarks: 15,
    type: 'quiz',
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

// Sample Leave Applications
db.leaveApplications = [
  {
    id: 'leave-001',
    studentId: 'student-001',
    startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    days: 3,
    reason: 'Family function - Sister\'s wedding ceremony',
    leaveType: 'casual',
    status: 'pending',
    createdAt: new Date().toISOString()
  },
  {
    id: 'leave-002',
    studentId: 'student-003',
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    days: 3,
    reason: 'Medical emergency - High fever and flu',
    leaveType: 'sick',
    status: 'approved',
    approvedBy: 'admin-001',
    approvedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Initialize Course Offerings for Current Semester
db.subjects.forEach((subject, index) => {
  db.courseOfferings.push({
    id: `offering-${subject.id}`,
    subjectId: subject.id,
    semesterId: 'sem-001',
    teacherId: db.teachers[index % db.teachers.length]?.id,
    capacity: 50,
    enrolled: Math.floor(Math.random() * 30) + 10,
    schedule: ['Mon, Wed 10:00-11:30', 'Tue, Thu 11:00-12:30', 'Mon, Wed 14:00-15:30'][index % 3],
    room: `Room ${101 + index}`,
    status: 'open',
    createdAt: new Date().toISOString()
  });
});

// Sample Enrollments for Students
db.students.forEach(student => {
  // Each student enrolled in 4-6 courses
  const numCourses = Math.floor(Math.random() * 3) + 4;
  const shuffledOfferings = [...db.courseOfferings].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < numCourses && i < shuffledOfferings.length; i++) {
    db.enrollments.push({
      id: `enroll-${student.id}-${shuffledOfferings[i].id}`,
      studentId: student.id,
      offeringId: shuffledOfferings[i].id,
      semesterId: 'sem-001',
      status: 'enrolled',
      enrolledAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
});

// ============================================
// ROUTES
// ============================================

const authRoutes = require('./routes/auth')(db);
const studentRoutes = require('./routes/students')(db);
const teacherRoutes = require('./routes/teachers')(db);
const attendanceRoutes = require('./routes/attendance')(db);
const marksRoutes = require('./routes/marks')(db);
const feesRoutes = require('./routes/fees')(db);
const announcementRoutes = require('./routes/announcements')(db);
const timetableRoutes = require('./routes/timetable')(db);
const dashboardRoutes = require('./routes/dashboard')(db);
const pdfRoutes = require('./routes/pdf')(db);
const analyticsRoutes = require('./routes/analytics')(db);

// NEW ADVANCED ROUTES
const assignmentRoutes = require('./routes/assignments')(db);
const leaveRoutes = require('./routes/leave')(db);
const qrAttendanceRoutes = require('./routes/qrattendance')(db);
const courseRoutes = require('./routes/courses')(db);

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/fees', feesRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/analytics', analyticsRoutes);

// NEW ADVANCED ROUTES
app.use('/api/assignments', assignmentRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/qr-attendance', qrAttendanceRoutes);
app.use('/api/courses', courseRoutes);

// Subjects & Departments (public)
app.get('/api/subjects', (req, res) => res.json(db.subjects));
app.get('/api/departments', (req, res) => res.json(db.departments));
app.get('/api/semesters', (req, res) => res.json(db.semesters));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'IUB Student Management System API v3.0 - Advanced Edition',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    features: [
      'Authentication & Authorization',
      'Student Management',
      'Teacher Management',
      'Attendance System',
      'QR Code Attendance',
      'Marks & Results',
      'GPA/CGPA Calculation',
      'Fee Management',
      'Assignment Submission',
      'Leave Management',
      'Course Registration',
      'Timetable',
      'Announcements',
      'Analytics Dashboard',
      'PDF Reports'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const localIP = getLocalIP();
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     🎓 IUB STUDENT MANAGEMENT SYSTEM - Backend v3.0 Advanced    ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  🌐 Local:  http://localhost:${PORT}                                ║`);
  console.log(`║  📱 Phone:  http://${localIP}:${PORT}                             ║`);
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║  📋 LOGIN CREDENTIALS:                                           ║');
  console.log('║  ─────────────────────────────────────────────────────────────   ║');
  console.log('║  👨‍💼 Admin:   admin@iub.edu.pk / admin123                         ║');
  console.log('║  👨‍🏫 Teacher: teacher@iub.edu.pk / teacher123                     ║');
  console.log('║  👨‍🎓 Student: ahmad.raza@student.iub.edu.pk / student123         ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║  ⚡ ADVANCED FEATURES:                                           ║');
  console.log('║  ─────────────────────────────────────────────────────────────   ║');
  console.log('║  ✅ QR Code Attendance      ✅ Assignment Submission            ║');
  console.log('║  ✅ Leave Management        ✅ Course Registration              ║');
  console.log('║  ✅ Analytics Dashboard     ✅ GPA/CGPA Calculation             ║');
  console.log('║  ✅ PDF Reports             ✅ Real-time Notifications          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
});
