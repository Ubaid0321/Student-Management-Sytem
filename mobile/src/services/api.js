import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your backend URL
const API_BASE_URL = 'http://192.168.1.16:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      AsyncStorage.removeItem('token');
      AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: (userId) => api.get(`/auth/me/${userId}`),
  updateProfile: (userId, data) => api.put(`/auth/profile/${userId}`, data),
  changePassword: (data) => api.post('/auth/change-password', data),
  logout: (userId) => api.post('/auth/logout', { userId }),
  getNotifications: (userId) => api.get(`/auth/notifications/${userId}`),
  markNotificationRead: (id) => api.put(`/auth/notifications/${id}/read`),
  markAllNotificationsRead: (userId) => api.put(`/auth/notifications/read-all/${userId}`),
};

// Student APIs
export const studentAPI = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  updateStatus: (id, status) => api.patch(`/students/${id}/status`, { status }),
  promote: (studentIds, newSemester) => api.post('/students/promote', { studentIds, newSemester }),
  getSubjects: () => api.get('/students/data/subjects'),
  getDepartments: () => api.get('/students/data/departments'),
};

// Teacher APIs
export const teacherAPI = {
  getAll: () => api.get('/teachers'),
  getById: (id) => api.get(`/teachers/${id}`),
  create: (data) => api.post('/teachers', data),
  update: (id, data) => api.put(`/teachers/${id}`, data),
  delete: (id) => api.delete(`/teachers/${id}`),
  assignSubjects: (id, subjectIds) => api.post(`/teachers/${id}/subjects`, { subjectIds }),
  getStudents: (id) => api.get(`/teachers/${id}/students`),
};

// Attendance APIs
export const attendanceAPI = {
  getAll: (params) => api.get('/attendance', { params }),
  getByStudent: (studentId, params) => api.get(`/attendance/student/${studentId}`, { params }),
  mark: (date, attendanceRecords) => api.post('/attendance', { date, attendanceRecords }),
  update: (id, status) => api.put(`/attendance/${id}`, { status }),
  getSummary: (params) => api.get('/attendance/summary/all', { params }),
};

// Marks APIs
export const marksAPI = {
  getAll: (params) => api.get('/marks', { params }),
  getByStudent: (studentId, params) => api.get(`/marks/student/${studentId}`, { params }),
  add: (data) => api.post('/marks', data),
  addBulk: (data) => api.post('/marks/bulk', data),
  delete: (id) => api.delete(`/marks/${id}`),
  getSubjects: () => api.get('/marks/subjects/all'),
  addSubject: (data) => api.post('/marks/subjects', data),
  getExamTypes: () => api.get('/marks/exam-types'),
  getPerformance: (subjectId, params) => api.get(`/marks/performance/${subjectId}`, { params }),
};

// Fee APIs
export const feeAPI = {
  getStructure: () => api.get('/fees/structure'),
  getAll: (params) => api.get('/fees', { params }),
  getByStudent: (studentId) => api.get(`/fees/student/${studentId}`),
  create: (data) => api.post('/fees', data),
  recordPayment: (id, data) => api.post(`/fees/${id}/pay`, data),
  getSummary: (params) => api.get('/fees/summary', { params }),
  getDefaulters: () => api.get('/fees/defaulters'),
};

// Announcement APIs
export const announcementAPI = {
  getAll: (params) => api.get('/announcements', { params }),
  getById: (id) => api.get(`/announcements/${id}`),
  create: (data) => api.post('/announcements', data),
  update: (id, data) => api.put(`/announcements/${id}`, data),
  delete: (id) => api.delete(`/announcements/${id}`),
  getTypes: () => api.get('/announcements/meta/types'),
};

// Timetable APIs
export const timetableAPI = {
  getAll: (params) => api.get('/timetable', { params }),
  getByStudent: (studentId) => api.get(`/timetable/student/${studentId}`),
  getByTeacher: (teacherId) => api.get(`/timetable/teacher/${teacherId}`),
  create: (data) => api.post('/timetable', data),
  update: (id, data) => api.put(`/timetable/${id}`, data),
  delete: (id) => api.delete(`/timetable/${id}`),
  getExams: (params) => api.get('/timetable/exams', { params }),
  createExam: (data) => api.post('/timetable/exams', data),
};

// Dashboard APIs
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getQuickStats: () => api.get('/dashboard/quick-stats'),
  getStudentDashboard: (studentId) => api.get(`/dashboard/student/${studentId}`),
};

// Analytics APIs
export const analyticsAPI = {
  getAll: (params) => api.get('/analytics', { params }),
  getStudentAnalytics: (studentId) => api.get(`/analytics/student/${studentId}`),
};

// General APIs
export const generalAPI = {
  getSubjects: () => api.get('/subjects'),
  getDepartments: () => api.get('/departments'),
  getSemesters: () => api.get('/semesters'),
  health: () => api.get('/health'),
};

// PDF URLs (for download/sharing)
export const getPDFUrls = {
  studentDetails: (studentId) => `${API_BASE_URL}/pdf/student/${studentId}`,
  attendance: (studentId, startDate, endDate) => 
    `${API_BASE_URL}/pdf/attendance/${studentId}?startDate=${startDate}&endDate=${endDate}`,
  result: (studentId, examType) => 
    `${API_BASE_URL}/pdf/result/${studentId}${examType ? `?examType=${examType}` : ''}`,
  feeReceipt: (paymentId) => `${API_BASE_URL}/pdf/fee-receipt/${paymentId}`,
};

export { API_BASE_URL };
export default api;
