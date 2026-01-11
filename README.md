# 🎓 IUB Student Management System

A comprehensive **Mobile Application** for managing students, teachers, attendance, marks, fees, and announcements at The Islamia University of Bahawalpur.

## 📋 Project Overview

This is a full-stack mobile application built for the **Final Year Project** that provides a complete solution for educational institution management. The system supports multiple user roles (Admin, Teacher, Student) with role-specific dashboards and features.

---

## ✨ Features

### 👨‍💼 Admin Features
- **Dashboard Analytics** - Real-time statistics with visual charts
- **Student Management** - Complete CRUD operations for student records
- **Teacher Management** - Add, edit, and manage teaching staff
- **Attendance System** - Mark and track attendance with date filtering
- **Marks Management** - Add subject-wise marks with GPA calculation
- **Fee Management** - Track fee collection, payments, and defaulters
- **Announcements** - Create and manage announcements for all users
- **Timetable Management** - Create and manage class schedules
- **Reports Generation** - PDF reports for attendance, results, and profiles

### 👨‍🏫 Teacher Features
- **Class Management** - View assigned classes and students
- **Mark Attendance** - Mark student attendance for assigned classes
- **Add Marks** - Enter marks for subjects they teach
- **View Timetable** - Personal teaching schedule
- **Announcements** - View relevant announcements

### 👨‍🎓 Student Features
- **Personal Dashboard** - Overview of academic performance
- **View Attendance** - Check attendance records and percentage
- **View Results** - Subject-wise marks and CGPA
- **Fee Status** - View fee dues and payment history
- **Timetable** - View class schedule
- **Announcements** - Stay updated with university news
- **Profile Management** - Update personal information

---

## 🛠️ Technology Stack

### Frontend (Mobile App)
| Technology | Purpose |
|------------|---------|
| React Native | Cross-platform mobile development |
| Expo | Development toolchain & build system |
| React Navigation | Screen navigation |
| Expo Linear Gradient | Gradient UI components |
| Ionicons | Icon library |
| Axios | API communication |
| AsyncStorage | Local data persistence |

### Backend (API Server)
| Technology | Purpose |
|------------|---------|
| Node.js | Server runtime |
| Express.js | Web framework |
| UUID | Unique ID generation |
| CORS | Cross-origin resource sharing |

---

## 📁 Project Structure

```
Student Management System/
├── backend/
│   ├── routes/
│   │   ├── auth.js          # Authentication endpoints
│   │   ├── students.js      # Student CRUD operations
│   │   ├── teachers.js      # Teacher management
│   │   ├── attendance.js    # Attendance marking & reports
│   │   ├── marks.js         # Marks & GPA calculation
│   │   ├── fees.js          # Fee management
│   │   ├── announcements.js # Announcements system
│   │   ├── timetable.js     # Schedule management
│   │   ├── dashboard.js     # Dashboard statistics
│   │   ├── analytics.js     # Performance analytics
│   │   └── pdf.js           # PDF report generation
│   ├── server.js            # Main server file
│   └── package.json
│
├── mobile/
│   ├── src/
│   │   ├── services/
│   │   │   └── api.js       # API service layer
│   │   ├── theme/
│   │   │   └── index.js     # Design system & styling
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── screens/
│   │   │   ├── admin/       # Admin screens
│   │   │   ├── student/     # Student screens
│   │   │   └── auth/        # Login screen
│   │   └── navigation/
│   ├── App.js               # Main application entry
│   ├── app.json             # Expo configuration
│   └── package.json
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Expo Go** app on your mobile device
- **Git** (optional)

### Installation

#### 1. Clone/Download the Project
```bash
cd "Student Management System"
```

#### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

#### 3. Install Mobile Dependencies
```bash
cd ../mobile
npm install
```

### Running the Application

#### 1. Start Backend Server
```bash
cd backend
node server.js
```
You should see:
```
╔════════════════════════════════════════════════════════════╗
║     🎓 IUB STUDENT MANAGEMENT SYSTEM - Backend v2.0       ║
╠════════════════════════════════════════════════════════════╣
║  🌐 Local:  http://localhost:5000                          ║
║  📱 Phone:  http://192.168.x.x:5000                       ║
╠════════════════════════════════════════════════════════════╣
║  📋 LOGIN CREDENTIALS:                                     ║
║  👨‍💼 Admin:   admin@iub.edu.pk / admin123                   ║
║  👨‍🏫 Teacher: teacher@iub.edu.pk / teacher123               ║
║  👨‍🎓 Student: ahmad.raza@student.iub.edu.pk / student123   ║
╚════════════════════════════════════════════════════════════╝
```

#### 2. Update API URL in Mobile App
Open `mobile/src/services/api.js` and update the IP address:
```javascript
const API_BASE_URL = 'http://YOUR_LOCAL_IP:5000/api';
```

Also update in `mobile/App.js`:
```javascript
const API_URL = 'http://YOUR_LOCAL_IP:5000/api';
```

#### 3. Start Mobile App
```bash
cd mobile
npx expo start
```

#### 4. Run on Device
- Open **Expo Go** app on your phone
- Scan the QR code or enter: `exp://YOUR_IP:8081`

---

## 🔐 Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@iub.edu.pk | admin123 |
| **Teacher** | teacher@iub.edu.pk | teacher123 |
| **Student** | ahmad.raza@student.iub.edu.pk | student123 |

---

## 📊 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me/:userId` | Get user profile |
| PUT | `/api/auth/profile/:userId` | Update profile |
| POST | `/api/auth/change-password` | Change password |

### Students
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/students` | Get all students |
| GET | `/api/students/:id` | Get student by ID |
| POST | `/api/students` | Add new student |
| PUT | `/api/students/:id` | Update student |
| DELETE | `/api/students/:id` | Delete student |

### Teachers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teachers` | Get all teachers |
| POST | `/api/teachers` | Add new teacher |
| POST | `/api/teachers/:id/subjects` | Assign subjects |

### Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/attendance` | Get attendance records |
| GET | `/api/attendance/student/:id` | Student attendance |
| POST | `/api/attendance` | Mark attendance |
| GET | `/api/attendance/summary/all` | Attendance summary |

### Marks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/marks` | Get all marks |
| GET | `/api/marks/student/:id` | Student marks with CGPA |
| POST | `/api/marks` | Add marks |
| POST | `/api/marks/bulk` | Bulk add marks |

### Fees
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fees` | Get fee records |
| GET | `/api/fees/student/:id` | Student fee status |
| POST | `/api/fees/:id/pay` | Record payment |
| GET | `/api/fees/defaulters` | Get defaulters list |

### Announcements
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/announcements` | Get all announcements |
| POST | `/api/announcements` | Create announcement |
| PUT | `/api/announcements/:id` | Update announcement |
| DELETE | `/api/announcements/:id` | Delete announcement |

### Dashboard & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Admin dashboard stats |
| GET | `/api/dashboard/student/:id` | Student dashboard |
| GET | `/api/analytics` | Comprehensive analytics |

### PDF Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pdf/student/:id` | Student profile PDF |
| GET | `/api/pdf/attendance/:id` | Attendance report PDF |
| GET | `/api/pdf/result/:id` | Result card PDF |

---

## 🎨 UI/UX Features

- **Modern Design** - Clean, professional interface with gradient headers
- **Responsive Layout** - Works on all screen sizes
- **Smooth Animations** - Fade, slide, and scale animations
- **Pull to Refresh** - Swipe down to refresh data
- **Status Indicators** - Color-coded status badges
- **Progress Bars** - Visual progress for attendance and fees
- **Bottom Navigation** - Easy access to main sections
- **Quick Actions** - One-tap access to common functions

---

## 📈 Key Metrics & Calculations

### Attendance Percentage
```
Attendance % = (Present Days / Total Days) × 100
Warning threshold: < 75%
```

### GPA Calculation
```
Grade Points:
A+ (90-100%) = 4.0    A (85-89%) = 4.0    A- (80-84%) = 3.7
B+ (75-79%) = 3.3     B (70-74%) = 3.0    B- (65-69%) = 2.7
C+ (60-64%) = 2.3     C (55-59%) = 2.0    C- (50-54%) = 1.7
D  (45-49%) = 1.0     F  (<45%)  = 0.0

CGPA = Σ(Credit Hours × Grade Points) / Σ(Credit Hours)
```

### Fee Collection Rate
```
Collection % = (Total Collected / Total Due) × 100
```

---

## 🔧 Troubleshooting

### "Network Error" on Mobile
1. Ensure backend is running
2. Check firewall: `sudo ufw allow 5000`
3. Verify correct IP address in `api.js`
4. Both devices must be on same WiFi

### "Invalid Credentials"
1. Use exact email format
2. Password is case-sensitive
3. Check backend console for errors

### Expo App Not Loading
1. Clear Expo cache: `npx expo start --clear`
2. Restart Expo Go app
3. Check for console errors

---

## 👥 Team Members

| Name | Role | Contribution |
|------|------|--------------|
| [Your Name] | Lead Developer | Full-stack development |
| [Member 2] | Backend | API development |
| [Member 3] | Frontend | UI/UX design |

---

## 📝 Future Enhancements

- [ ] Firebase/Cloud Database integration
- [ ] Push notifications
- [ ] Biometric attendance
- [ ] Parent portal
- [ ] Chat system
- [ ] Assignment submission
- [ ] Library management
- [ ] Hostel management
- [ ] Transport management

---

## 📄 License

This project is developed for educational purposes as a Final Year Project at The Islamia University of Bahawalpur.

---

## 🙏 Acknowledgments

- The Islamia University of Bahawalpur
- Department of Computer Science
- Project Supervisor: [Supervisor Name]

---

**© 2025-2026 IUB Student Management System. All Rights Reserved.**
