# Student Management System - Backend API

A Node.js/Express backend for the Student Management System.

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Create a `.env` file:
```
PORT=5000
```

3. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

## Default Credentials

- **Admin**: admin@iub.edu.pk / admin123

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login (admin/student)
- `POST /api/auth/register-admin` - Register new admin
- `GET /api/auth/me/:userId` - Get current user

### Students
- `GET /api/students` - List all students
- `GET /api/students/:id` - Get student details
- `POST /api/students` - Add new student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Attendance
- `GET /api/attendance` - Get attendance records
- `GET /api/attendance/student/:studentId` - Get student attendance
- `POST /api/attendance` - Mark attendance
- `PUT /api/attendance/:id` - Update attendance
- `GET /api/attendance/summary/all` - Get attendance summary

### Marks/Results
- `GET /api/marks` - Get all marks
- `GET /api/marks/student/:studentId` - Get student results
- `POST /api/marks` - Add marks
- `POST /api/marks/bulk` - Bulk add marks
- `GET /api/marks/subjects/all` - Get all subjects
- `POST /api/marks/subjects` - Add subject

### PDF Generation
- `GET /api/pdf/student/:studentId` - Student details PDF
- `GET /api/pdf/attendance/:studentId` - Attendance report PDF
- `GET /api/pdf/result/:studentId` - Result card PDF

### Dashboard
- `GET /api/dashboard/stats` - Admin dashboard statistics

