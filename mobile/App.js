import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Dimensions,
  Animated,
  FlatList,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import config from './config';

const { width, height } = Dimensions.get('window');
const API_URL = config.API_URL;

// Color palette
const colors = {
  primary: '#0f172a',
  primaryLight: '#1e293b',
  secondary: '#f59e0b',
  accent: '#14b8a6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  white: '#ffffff',
  background: '#f8fafc',
  gray: {
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
  },
  text: '#0f172a',
  textSecondary: '#64748b',
};

// ============================================
// MAIN APP COMPONENT
// ============================================
export default function App() {
  const [screen, setScreen] = useState('loading');
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [students, setStudents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        // Route based on role
        if (parsedUser.role === 'student') {
          setScreen('student');
        } else if (parsedUser.role === 'teacher') {
          setScreen('teacher');
        } else {
          setScreen('admin');
        }
        loadData(parsedUser);
      } else {
        setScreen('login');
      }
    } catch (error) {
      setScreen('login');
    }
  };

  const loadData = async (currentUser) => {
    try {
      // Load dashboard
      const dashUrl = currentUser.role === 'student' 
        ? `${API_URL}/dashboard/student/${currentUser.id}`
        : `${API_URL}/dashboard/stats`;
      
      const dashRes = await fetch(dashUrl);
      if (dashRes.ok) {
        const data = await dashRes.json();
        setDashboardData(data);
      }

      // Load students (for admin)
      if (currentUser.role !== 'student') {
        const studRes = await fetch(`${API_URL}/students`);
        if (studRes.ok) {
          const data = await studRes.json();
          setStudents(data);
        }
      }

      // Load announcements
      const annRes = await fetch(`${API_URL}/announcements?active=true`);
      if (annRes.ok) {
        const data = await annRes.json();
        setAnnouncements(data);
      }
    } catch (error) {
      console.log('Load error:', error);
    }
  };

  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        await AsyncStorage.setItem('token', data.token);
        setUser(data.user);
        // Route based on role
        if (data.user.role === 'student') {
          setScreen('student');
        } else if (data.user.role === 'teacher') {
          setScreen('teacher');
        } else {
          setScreen('admin');
        }
        setCurrentScreen('dashboard');
        loadData(data.user);
      } else {
        Alert.alert('Login Failed', data.error || 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not connect to server. Check your network.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('token');
    setUser(null);
    setDashboardData(null);
    setStudents([]);
    setScreen('login');
    setCurrentScreen('dashboard');
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user) {
      await loadData(user);
    }
    setRefreshing(false);
  }, [user]);

  const openModal = (type, data = null) => {
    setModalType(type);
    setSelectedStudent(data);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setModalType('');
    setSelectedStudent(null);
  };

  if (screen === 'loading') {
    return <SplashScreen />;
  }

  if (screen === 'login') {
    return <LoginScreen onLogin={handleLogin} loading={loading} setScreen={setScreen} />;
  }

  if (screen === 'signup') {
    return <SignupScreen setScreen={setScreen} />;
  }

  if (screen === 'student') {
    return (
      <StudentApp
        user={user}
        data={dashboardData}
        announcements={announcements}
        onLogout={handleLogout}
        onRefresh={onRefresh}
        refreshing={refreshing}
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
      />
    );
  }

  if (screen === 'teacher') {
    return (
      <TeacherApp
        user={user}
        data={dashboardData}
        students={students}
        announcements={announcements}
        onLogout={handleLogout}
        onRefresh={onRefresh}
        refreshing={refreshing}
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
        loadData={() => loadData(user)}
      />
    );
  }

  return (
    <AdminApp
      user={user}
      data={dashboardData}
      students={students}
      announcements={announcements}
      onLogout={handleLogout}
      onRefresh={onRefresh}
      refreshing={refreshing}
      currentScreen={currentScreen}
      setCurrentScreen={setCurrentScreen}
      openModal={openModal}
      closeModal={closeModal}
      modalVisible={modalVisible}
      modalType={modalType}
      selectedStudent={selectedStudent}
      loadData={() => loadData(user)}
    />
  );
}

// ============================================
// SPLASH SCREEN
// ============================================
function SplashScreen() {
  return (
    <LinearGradient colors={['#0f172a', '#1e3a5f', '#0891b2']} style={styles.splashContainer}>
      <StatusBar style="light" />
      <View style={styles.splashContent}>
        <View style={styles.splashLogo}>
          <Ionicons name="school" size={80} color="#fff" />
        </View>
        <Text style={styles.splashTitle}>IUB SMS</Text>
        <Text style={styles.splashSubtitle}>Student Management System</Text>
        <ActivityIndicator size="large" color="#f59e0b" style={{ marginTop: 40 }} />
      </View>
    </LinearGradient>
  );
}

// ============================================
// LOGIN SCREEN
// ============================================
function LoginScreen({ onLogin, loading, setScreen }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(null);

  const handleSubmit = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    onLogin(email.trim(), password);
  };

  return (
    <LinearGradient colors={['#0f172a', '#1e3a5f', '#0891b2']} style={styles.loginContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.loginSafe}>
        <ScrollView contentContainerStyle={styles.loginScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.loginContent}>
            <View style={styles.loginHeader}>
              <View style={styles.logoCircle}>
                <Ionicons name="school" size={50} color="#fff" />
              </View>
              <Text style={styles.loginTitle}>Welcome Back</Text>
              <Text style={styles.loginSubtitle}>Sign in to your account</Text>
            </View>

            <View style={styles.loginCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={[styles.inputWrapper, focused === 'email' && styles.inputWrapperFocused]}>
                  <Ionicons name="mail-outline" size={20} color={focused === 'email' ? colors.primary : colors.gray[400]} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.gray[400]}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={[styles.inputWrapper, focused === 'password' && styles.inputWrapperFocused]}>
                  <Ionicons name="lock-closed-outline" size={20} color={focused === 'password' ? colors.primary : colors.gray[400]} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.gray[400]}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={colors.gray[400]} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={[styles.loginButton, loading && styles.loginButtonDisabled]} onPress={handleSubmit} disabled={loading}>
                <LinearGradient colors={['#0f172a', '#1e3a5f']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.loginButtonGradient}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={styles.loginButtonText}>Sign In</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity style={styles.signupLink} onPress={() => setScreen('signup')}>
                <Text style={styles.signupLinkText}>Don't have an account? </Text>
                <Text style={styles.signupLinkBold}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ============================================
// SIGNUP SCREEN
// ============================================
function SignupScreen({ setScreen }) {
  const [userType, setUserType] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (userType === 'student' && !rollNumber.trim()) {
      Alert.alert('Error', 'Roll number is required for students');
      return;
    }

    setLoading(true);
    try {
      let endpoint = userType === 'student' ? '/students' : '/teachers';
      let body = {
        name: name.trim(),
        email: email.trim(),
        password: password,
        phone: phone.trim(),
      };

      if (userType === 'student') {
        body.rollNumber = rollNumber.trim();
        body.semester = 1;
        body.departmentId = 'dept-001';
      } else {
        body.designation = 'Lecturer';
        body.departmentId = 'dept-001';
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert(
          'Registration Successful!', 
          `Your account has been created. You can now login with:\n\nEmail: ${email}\nPassword: Your password`,
          [{ text: 'Go to Login', onPress: () => setScreen('login') }]
        );
      } else {
        Alert.alert('Registration Failed', data.error || 'Something went wrong');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0f172a', '#1e3a5f', '#0891b2']} style={styles.loginContainer}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.loginSafe}>
        <ScrollView contentContainerStyle={styles.loginScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.loginContent}>
            <View style={styles.loginHeader}>
              <View style={styles.logoCircle}>
                <Ionicons name="person-add" size={50} color="#fff" />
              </View>
              <Text style={styles.loginTitle}>Create Account</Text>
              <Text style={styles.loginSubtitle}>Join IUB Student Management System</Text>
            </View>

            <View style={styles.loginCard}>
              {/* User Type Selection */}
              <Text style={styles.inputLabel}>Register As</Text>
              <View style={styles.userTypeRow}>
                <TouchableOpacity 
                  style={[styles.userTypeBtn, userType === 'student' && styles.userTypeBtnActive]}
                  onPress={() => setUserType('student')}
                >
                  <Ionicons name="school" size={20} color={userType === 'student' ? '#fff' : colors.primary} />
                  <Text style={[styles.userTypeText, userType === 'student' && styles.userTypeTextActive]}>Student</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.userTypeBtn, userType === 'teacher' && styles.userTypeBtnActive]}
                  onPress={() => setUserType('teacher')}
                >
                  <Ionicons name="person" size={20} color={userType === 'teacher' ? '#fff' : colors.primary} />
                  <Text style={[styles.userTypeText, userType === 'teacher' && styles.userTypeTextActive]}>Teacher</Text>
                </TouchableOpacity>
              </View>

              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <View style={[styles.inputWrapper, focused === 'name' && styles.inputWrapperFocused]}>
                  <Ionicons name="person-outline" size={20} color={focused === 'name' ? colors.primary : colors.gray[400]} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.gray[400]}
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setFocused('name')}
                    onBlur={() => setFocused(null)}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address *</Text>
                <View style={[styles.inputWrapper, focused === 'email' && styles.inputWrapperFocused]}>
                  <Ionicons name="mail-outline" size={20} color={focused === 'email' ? colors.primary : colors.gray[400]} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.gray[400]}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                  />
                </View>
              </View>

              {/* Roll Number (only for students) */}
              {userType === 'student' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Roll Number *</Text>
                  <View style={[styles.inputWrapper, focused === 'roll' && styles.inputWrapperFocused]}>
                    <Ionicons name="id-card-outline" size={20} color={focused === 'roll' ? colors.primary : colors.gray[400]} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., IUB-2025-001"
                      placeholderTextColor={colors.gray[400]}
                      value={rollNumber}
                      onChangeText={setRollNumber}
                      autoCapitalize="characters"
                      onFocus={() => setFocused('roll')}
                      onBlur={() => setFocused(null)}
                    />
                  </View>
                </View>
              )}

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={[styles.inputWrapper, focused === 'phone' && styles.inputWrapperFocused]}>
                  <Ionicons name="call-outline" size={20} color={focused === 'phone' ? colors.primary : colors.gray[400]} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter phone number"
                    placeholderTextColor={colors.gray[400]}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    onFocus={() => setFocused('phone')}
                    onBlur={() => setFocused(null)}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password *</Text>
                <View style={[styles.inputWrapper, focused === 'password' && styles.inputWrapperFocused]}>
                  <Ionicons name="lock-closed-outline" size={20} color={focused === 'password' ? colors.primary : colors.gray[400]} />
                  <TextInput
                    style={styles.input}
                    placeholder="Create a password (min 6 chars)"
                    placeholderTextColor={colors.gray[400]}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={colors.gray[400]} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password *</Text>
                <View style={[styles.inputWrapper, focused === 'confirm' && styles.inputWrapperFocused]}>
                  <Ionicons name="lock-closed-outline" size={20} color={focused === 'confirm' ? colors.primary : colors.gray[400]} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your password"
                    placeholderTextColor={colors.gray[400]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    onFocus={() => setFocused('confirm')}
                    onBlur={() => setFocused(null)}
                  />
                </View>
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity style={[styles.loginButton, loading && styles.loginButtonDisabled]} onPress={handleSignup} disabled={loading}>
                <LinearGradient colors={['#0f172a', '#1e3a5f']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.loginButtonGradient}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={styles.loginButtonText}>Create Account</Text>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity style={styles.signupLink} onPress={() => setScreen('login')}>
                <Text style={styles.signupLinkText}>Already have an account? </Text>
                <Text style={styles.signupLinkBold}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ============================================
// ADMIN APP
// ============================================
function AdminApp({ user, data, students, announcements, onLogout, onRefresh, refreshing, currentScreen, setCurrentScreen, openModal, closeModal, modalVisible, modalType, selectedStudent, loadData }) {
  
  const renderScreen = () => {
    switch(currentScreen) {
      case 'students':
        return <StudentsScreen students={students} openModal={openModal} loadData={loadData} />;
      case 'attendance':
        return <AttendanceScreen students={students} loadData={loadData} />;
      case 'marks':
        return <MarksScreen students={students} loadData={loadData} />;
      case 'announcements':
        return <AnnouncementsScreen announcements={announcements} loadData={loadData} isAdmin={true} />;
      case 'fees':
        return <FeesScreen loadData={loadData} />;
      default:
        return <AdminDashboard user={user} data={data} students={students} announcements={announcements} onRefresh={onRefresh} refreshing={refreshing} setCurrentScreen={setCurrentScreen} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
          <Ionicons name={currentScreen === 'dashboard' ? 'grid' : 'arrow-back'} size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentScreen === 'dashboard' ? 'Dashboard' : currentScreen.charAt(0).toUpperCase() + currentScreen.slice(1)}
        </Text>
        <TouchableOpacity onPress={onLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {renderScreen()}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {[
          { id: 'dashboard', icon: 'grid', label: 'Home' },
          { id: 'students', icon: 'people', label: 'Students' },
          { id: 'attendance', icon: 'calendar', label: 'Attendance' },
          { id: 'marks', icon: 'document-text', label: 'Marks' },
          { id: 'fees', icon: 'cash', label: 'Fees' },
        ].map((item) => (
          <TouchableOpacity key={item.id} style={styles.bottomNavItem} onPress={() => setCurrentScreen(item.id)}>
            <Ionicons name={currentScreen === item.id ? item.icon : `${item.icon}-outline`} size={22} color={currentScreen === item.id ? colors.primary : colors.gray[400]} />
            <Text style={[styles.bottomNavLabel, currentScreen === item.id && styles.bottomNavLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Add Student Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <AddStudentModal closeModal={closeModal} loadData={loadData} student={selectedStudent} />
      </Modal>
    </SafeAreaView>
  );
}

// ============================================
// ADMIN DASHBOARD
// ============================================
function AdminDashboard({ user, data, students, announcements, onRefresh, refreshing, setCurrentScreen }) {
  const stats = data?.overview || {};
  const attendance = data?.attendance?.today || {};
  const fees = data?.fees || {};

  return (
    <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Welcome Card */}
      <LinearGradient colors={['#0f172a', '#1e3a5f']} style={styles.welcomeCard}>
        <View>
          <Text style={styles.welcomeText}>Welcome, {user?.name || 'Admin'}</Text>
          <Text style={styles.welcomeSubtext}>{user?.role?.toUpperCase()} • {new Date().toLocaleDateString()}</Text>
        </View>
        <View style={styles.welcomeAvatar}>
          <Text style={styles.welcomeAvatarText}>{user?.name?.charAt(0) || 'A'}</Text>
        </View>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: '#3b82f6' }]}>
          <Ionicons name="people" size={28} color="#3b82f6" />
          <Text style={styles.statValue}>{stats.totalStudents || students.length || 0}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#22c55e' }]}>
          <Ionicons name="checkmark-circle" size={28} color="#22c55e" />
          <Text style={styles.statValue}>{attendance.percentage || 0}%</Text>
          <Text style={styles.statLabel}>Attendance</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#f59e0b' }]}>
          <Ionicons name="cash" size={28} color="#f59e0b" />
          <Text style={styles.statValue}>{fees.collectionRate || 0}%</Text>
          <Text style={styles.statLabel}>Fee Rate</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionCard} onPress={() => setCurrentScreen('students')}>
          <View style={[styles.actionIcon, { backgroundColor: '#3b82f620' }]}>
            <Ionicons name="person-add" size={24} color="#3b82f6" />
          </View>
          <Text style={styles.actionLabel}>Manage Students</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => setCurrentScreen('attendance')}>
          <View style={[styles.actionIcon, { backgroundColor: '#22c55e20' }]}>
            <Ionicons name="calendar" size={24} color="#22c55e" />
          </View>
          <Text style={styles.actionLabel}>Mark Attendance</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => setCurrentScreen('marks')}>
          <View style={[styles.actionIcon, { backgroundColor: '#f59e0b20' }]}>
            <Ionicons name="create" size={24} color="#f59e0b" />
          </View>
          <Text style={styles.actionLabel}>Add Marks</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => setCurrentScreen('announcements')}>
          <View style={[styles.actionIcon, { backgroundColor: '#ef444420' }]}>
            <Ionicons name="megaphone" size={24} color="#ef4444" />
          </View>
          <Text style={styles.actionLabel}>Announcements</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Students */}
      <Text style={styles.sectionTitle}>Recent Students</Text>
      {students.slice(0, 5).map((student, index) => (
        <View key={student.id || index} style={styles.listItem}>
          <View style={styles.listAvatar}>
            <Text style={styles.listAvatarText}>{student.name?.charAt(0)}</Text>
          </View>
          <View style={styles.listInfo}>
            <Text style={styles.listTitle}>{student.name}</Text>
            <Text style={styles.listSubtitle}>{student.rollNumber} • {student.department}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: student.status === 'active' ? '#22c55e20' : '#f59e0b20' }]}>
            <Text style={[styles.statusText, { color: student.status === 'active' ? '#22c55e' : '#f59e0b' }]}>
              {student.status || 'Active'}
            </Text>
          </View>
        </View>
      ))}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ============================================
// STUDENTS SCREEN
// ============================================
function StudentsScreen({ students, openModal, loadData }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState(students);

  useEffect(() => {
    if (searchQuery) {
      const filtered = students.filter(s => 
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents(students);
    }
  }, [searchQuery, students]);

  const deleteStudent = async (id) => {
    Alert.alert('Delete Student', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${API_URL}/students/${id}`, { method: 'DELETE' });
            if (res.ok) {
              Alert.alert('Success', 'Student deleted');
              loadData();
            }
          } catch (e) {
            Alert.alert('Error', 'Failed to delete');
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.screenContainer}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={colors.gray[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search students..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={() => openModal('addStudent')}>
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add Student</Text>
      </TouchableOpacity>

      {/* Students List */}
      <FlatList
        data={filteredStudents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.studentCard}>
            <View style={styles.studentAvatar}>
              <Text style={styles.studentAvatarText}>{item.name?.charAt(0)}</Text>
            </View>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{item.name}</Text>
              <Text style={styles.studentMeta}>{item.rollNumber} • Sem {item.semester}</Text>
              <Text style={styles.studentMeta}>{item.department}</Text>
            </View>
            <View style={styles.studentActions}>
              <TouchableOpacity style={styles.iconButton} onPress={() => openModal('editStudent', item)}>
                <Ionicons name="create-outline" size={20} color="#3b82f6" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={() => deleteStudent(item.id)}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={50} color={colors.gray[300]} />
            <Text style={styles.emptyText}>No students found</Text>
          </View>
        }
      />
    </View>
  );
}

// ============================================
// ADD STUDENT MODAL
// ============================================
function AddStudentModal({ closeModal, loadData, student }) {
  const [name, setName] = useState(student?.name || '');
  const [email, setEmail] = useState(student?.email || '');
  const [password, setPassword] = useState('');
  const [rollNumber, setRollNumber] = useState(student?.rollNumber || '');
  const [phone, setPhone] = useState(student?.phone || '');
  const [semester, setSemester] = useState(student?.semester?.toString() || '1');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !email || !rollNumber) {
      Alert.alert('Error', 'Please fill required fields');
      return;
    }

    setLoading(true);
    try {
      const url = student ? `${API_URL}/students/${student.id}` : `${API_URL}/students`;
      const method = student ? 'PUT' : 'POST';
      
      const body = { name, email, rollNumber, phone, semester: parseInt(semester) };
      if (!student) body.password = password || 'student123';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', student ? 'Student updated' : 'Student added');
        loadData();
        closeModal();
      } else {
        Alert.alert('Error', data.error || 'Operation failed');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{student ? 'Edit Student' : 'Add Student'}</Text>
          <TouchableOpacity onPress={closeModal}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody}>
          <Text style={styles.fieldLabel}>Name *</Text>
          <TextInput style={styles.fieldInput} value={name} onChangeText={setName} placeholder="Full Name" />

          <Text style={styles.fieldLabel}>Email *</Text>
          <TextInput style={styles.fieldInput} value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" />

          {!student && (
            <>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput style={styles.fieldInput} value={password} onChangeText={setPassword} placeholder="Default: student123" secureTextEntry />
            </>
          )}

          <Text style={styles.fieldLabel}>Roll Number *</Text>
          <TextInput style={styles.fieldInput} value={rollNumber} onChangeText={setRollNumber} placeholder="IUB-2025-XXX" />

          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput style={styles.fieldInput} value={phone} onChangeText={setPhone} placeholder="Phone Number" keyboardType="phone-pad" />

          <Text style={styles.fieldLabel}>Semester</Text>
          <TextInput style={styles.fieldInput} value={semester} onChangeText={setSemester} placeholder="1-8" keyboardType="number-pad" />
        </ScrollView>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>{student ? 'Update' : 'Add'} Student</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================
// ATTENDANCE SCREEN
// ============================================
function AttendanceScreen({ students, loadData }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize attendance
    const initial = {};
    students.forEach(s => { initial[s.id] = 'present'; });
    setAttendance(initial);
  }, [students]);

  const toggleAttendance = (id) => {
    setAttendance(prev => ({
      ...prev,
      [id]: prev[id] === 'present' ? 'absent' : prev[id] === 'absent' ? 'late' : 'present'
    }));
  };

  const submitAttendance = async () => {
    setLoading(true);
    try {
      const records = Object.entries(attendance).map(([studentId, status]) => ({ studentId, status }));
      const res = await fetch(`${API_URL}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, attendanceRecords: records }),
      });

      if (res.ok) {
        Alert.alert('Success', 'Attendance marked successfully');
        loadData();
      } else {
        Alert.alert('Error', 'Failed to mark attendance');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'present') return '#22c55e';
    if (status === 'absent') return '#ef4444';
    return '#f59e0b';
  };

  return (
    <View style={styles.screenContainer}>
      {/* Date */}
      <View style={styles.dateCard}>
        <Ionicons name="calendar" size={24} color={colors.primary} />
        <Text style={styles.dateText}>{date}</Text>
      </View>

      {/* Students List */}
      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.attendanceItem} onPress={() => toggleAttendance(item.id)}>
            <View style={styles.studentAvatar}>
              <Text style={styles.studentAvatarText}>{item.name?.charAt(0)}</Text>
            </View>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{item.name}</Text>
              <Text style={styles.studentMeta}>{item.rollNumber}</Text>
            </View>
            <View style={[styles.attendanceBadge, { backgroundColor: getStatusColor(attendance[item.id]) }]}>
              <Text style={styles.attendanceBadgeText}>{attendance[item.id]?.toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 150 }}
      />

      {/* Submit Button */}
      <View style={styles.floatingButton}>
        <TouchableOpacity style={styles.submitButton} onPress={submitAttendance} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Attendance</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================
// MARKS SCREEN
// ============================================
function MarksScreen({ students, loadData }) {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [examType, setExamType] = useState('midterm');
  const [maxMarks, setMaxMarks] = useState('100');
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await fetch(`${API_URL}/subjects`);
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
        if (data.length > 0) setSelectedSubject(data[0].id);
      }
    } catch (e) {
      console.log('Subjects fetch error');
    }
  };

  const updateMarks = (studentId, value) => {
    setMarks(prev => ({ ...prev, [studentId]: value }));
  };

  const submitMarks = async () => {
    if (!selectedSubject) {
      Alert.alert('Error', 'Please select a subject');
      return;
    }

    setLoading(true);
    try {
      const records = Object.entries(marks)
        .filter(([_, m]) => m !== '' && m !== undefined)
        .map(([studentId, obtainedMarks]) => ({
          studentId,
          obtainedMarks: parseFloat(obtainedMarks),
        }));

      const res = await fetch(`${API_URL}/marks/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: selectedSubject,
          examType,
          maxMarks: parseFloat(maxMarks),
          records,
        }),
      });

      if (res.ok) {
        Alert.alert('Success', 'Marks added successfully');
        setMarks({});
        loadData();
      } else {
        Alert.alert('Error', 'Failed to add marks');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      {/* Subject Selection */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectScroll}>
        {subjects.map(sub => (
          <TouchableOpacity
            key={sub.id}
            style={[styles.subjectChip, selectedSubject === sub.id && styles.subjectChipActive]}
            onPress={() => setSelectedSubject(sub.id)}
          >
            <Text style={[styles.subjectChipText, selectedSubject === sub.id && styles.subjectChipTextActive]}>
              {sub.code}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Exam Type & Max Marks */}
      <View style={styles.marksConfig}>
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Exam Type</Text>
          <View style={styles.examTypeRow}>
            {['quiz', 'midterm', 'final'].map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.examTypeBtn, examType === type && styles.examTypeBtnActive]}
                onPress={() => setExamType(type)}
              >
                <Text style={[styles.examTypeText, examType === type && styles.examTypeTextActive]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>Max Marks</Text>
          <TextInput
            style={styles.maxMarksInput}
            value={maxMarks}
            onChangeText={setMaxMarks}
            keyboardType="number-pad"
          />
        </View>
      </View>

      {/* Students Marks Entry */}
      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.marksItem}>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{item.name}</Text>
              <Text style={styles.studentMeta}>{item.rollNumber}</Text>
            </View>
            <TextInput
              style={styles.marksInput}
              placeholder="0"
              keyboardType="number-pad"
              value={marks[item.id]?.toString() || ''}
              onChangeText={(val) => updateMarks(item.id, val)}
            />
            <Text style={styles.maxMarksLabel}>/ {maxMarks}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 150 }}
      />

      {/* Submit Button */}
      <View style={styles.floatingButton}>
        <TouchableOpacity style={styles.submitButton} onPress={submitMarks} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="save" size={24} color="#fff" />
              <Text style={styles.submitButtonText}>Save Marks</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================
// FEES SCREEN
// ============================================
function FeesScreen({ loadData }) {
  const [feeData, setFeeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    try {
      const res = await fetch(`${API_URL}/fees`);
      if (res.ok) {
        const data = await res.json();
        setFeeData(data);
      }
    } catch (e) {
      console.log('Fee fetch error');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = filter === 'all' ? feeData : feeData.filter(f => f.status === filter);

  const getStatusColor = (status) => {
    if (status === 'paid') return '#22c55e';
    if (status === 'partial') return '#f59e0b';
    return '#ef4444';
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {['all', 'paid', 'partial', 'pending'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Fee Records */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.feeCard}>
            <View style={styles.feeHeader}>
              <Text style={styles.feeName}>{item.studentName}</Text>
              <View style={[styles.feeStatus, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                <Text style={[styles.feeStatusText, { color: getStatusColor(item.status) }]}>
                  {item.status?.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.feeRoll}>{item.studentRollNumber}</Text>
            <View style={styles.feeDetails}>
              <View style={styles.feeDetail}>
                <Text style={styles.feeDetailLabel}>Total</Text>
                <Text style={styles.feeDetailValue}>Rs. {item.totalAmount?.toLocaleString()}</Text>
              </View>
              <View style={styles.feeDetail}>
                <Text style={styles.feeDetailLabel}>Paid</Text>
                <Text style={[styles.feeDetailValue, { color: '#22c55e' }]}>Rs. {item.paidAmount?.toLocaleString()}</Text>
              </View>
              <View style={styles.feeDetail}>
                <Text style={styles.feeDetailLabel}>Balance</Text>
                <Text style={[styles.feeDetailValue, { color: '#ef4444' }]}>Rs. {item.balance?.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cash-outline" size={50} color={colors.gray[300]} />
            <Text style={styles.emptyText}>No records found</Text>
          </View>
        }
      />
    </View>
  );
}

// ============================================
// ANNOUNCEMENTS SCREEN
// ============================================
function AnnouncementsScreen({ announcements, loadData, isAdmin }) {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const createAnnouncement = async () => {
    if (!title || !content) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, type: 'general', priority: 'medium', targetAudience: 'all' }),
      });

      if (res.ok) {
        Alert.alert('Success', 'Announcement created');
        setTitle('');
        setContent('');
        setShowAdd(false);
        loadData();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      {isAdmin && (
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAdd(!showAdd)}>
          <Ionicons name={showAdd ? 'close' : 'add'} size={24} color="#fff" />
          <Text style={styles.addButtonText}>{showAdd ? 'Cancel' : 'New Announcement'}</Text>
        </TouchableOpacity>
      )}

      {showAdd && (
        <View style={styles.addForm}>
          <TextInput
            style={styles.fieldInput}
            placeholder="Title"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.fieldInput, { height: 100, textAlignVertical: 'top' }]}
            placeholder="Content"
            value={content}
            onChangeText={setContent}
            multiline
          />
          <TouchableOpacity style={styles.submitButton} onPress={createAnnouncement} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Post</Text>}
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.announcementCard}>
            <View style={styles.announcementHeader}>
              <View style={[styles.announcementType, { backgroundColor: item.priority === 'high' ? '#ef444420' : '#14b8a620' }]}>
                <Ionicons
                  name={item.type === 'exam' ? 'document-text' : 'megaphone'}
                  size={16}
                  color={item.priority === 'high' ? '#ef4444' : '#14b8a6'}
                />
              </View>
              <Text style={styles.announcementDate}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}</Text>
            </View>
            <Text style={styles.announcementTitle}>{item.title}</Text>
            <Text style={styles.announcementContent} numberOfLines={3}>{item.content}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
}

// ============================================
// TEACHER APP - COMPLETE FUNCTIONALITY
// ============================================
function TeacherApp({ user, data, students, announcements, onLogout, onRefresh, refreshing, currentScreen, setCurrentScreen, loadData }) {
  
  const screenTitles = {
    dashboard: `Welcome, ${user?.name?.split(' ')[0]}`,
    attendance: 'Mark Attendance',
    assignments: 'Manage Assignments',
    marks: 'Enter Marks',
    students: 'My Students',
    leave: 'Leave Requests',
    timetable: 'My Schedule',
    profile: 'My Profile'
  };

  const renderScreen = () => {
    switch(currentScreen) {
      case 'attendance':
        return <TeacherAttendanceScreen user={user} students={students} loadData={loadData} />;
      case 'assignments':
        return <TeacherAssignmentsScreen user={user} loadData={loadData} />;
      case 'marks':
        return <TeacherMarksScreen user={user} students={students} loadData={loadData} />;
      case 'students':
        return <TeacherStudentsScreen user={user} students={students} />;
      case 'leave':
        return <TeacherLeaveScreen user={user} loadData={loadData} />;
      case 'timetable':
        return <TeacherTimetableScreen user={user} />;
      case 'profile':
        return <TeacherProfileScreen user={user} onLogout={onLogout} />;
      default:
        return <TeacherDashboard user={user} data={data} students={students} onRefresh={onRefresh} refreshing={refreshing} setCurrentScreen={setCurrentScreen} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
          <Ionicons name={currentScreen === 'dashboard' ? 'school' : 'arrow-back'} size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{screenTitles[currentScreen] || 'Dashboard'}</Text>
        <TouchableOpacity onPress={() => setCurrentScreen('profile')}>
          <Ionicons name={currentScreen === 'profile' ? 'person' : 'person-outline'} size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {renderScreen()}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {[
          { id: 'dashboard', icon: 'home', label: 'Home' },
          { id: 'attendance', icon: 'qr-code', label: 'Attend' },
          { id: 'assignments', icon: 'document-text', label: 'Tasks' },
          { id: 'marks', icon: 'create', label: 'Marks' },
          { id: 'leave', icon: 'calendar', label: 'Leave' },
        ].map((item) => (
          <TouchableOpacity key={item.id} style={styles.bottomNavItem} onPress={() => setCurrentScreen(item.id)}>
            <Ionicons name={currentScreen === item.id ? item.icon : `${item.icon}-outline`} size={22} color={currentScreen === item.id ? colors.primary : colors.gray[400]} />
            <Text style={[styles.bottomNavLabel, currentScreen === item.id && styles.bottomNavLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

// ============================================
// TEACHER DASHBOARD
// ============================================
function TeacherDashboard({ user, data, students, onRefresh, refreshing, setCurrentScreen }) {
  const [stats, setStats] = useState({ todayAttendance: 0, pendingAssignments: 0, pendingLeaves: 0 });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch today's attendance count
      const today = new Date().toISOString().split('T')[0];
      const attRes = await fetch(`${API_URL}/attendance?date=${today}`);
      if (attRes.ok) {
        const attData = await attRes.json();
        const presentCount = attData.filter(a => a.status === 'present').length;
        setStats(s => ({ ...s, todayAttendance: presentCount }));
      }
      
      // Fetch pending leaves
      const leaveRes = await fetch(`${API_URL}/leave?status=pending`);
      if (leaveRes.ok) {
        const leaveData = await leaveRes.json();
        setStats(s => ({ ...s, pendingLeaves: leaveData.length }));
      }
    } catch (e) {
      console.log('Stats fetch error');
    }
  };

  const quickActions = [
    { id: 'attendance', icon: 'qr-code', label: 'Mark Attendance', color: '#22c55e', desc: 'QR or Manual' },
    { id: 'assignments', icon: 'document-text', label: 'Assignments', color: '#3b82f6', desc: 'Create & Grade' },
    { id: 'marks', icon: 'create', label: 'Enter Marks', color: '#f59e0b', desc: 'Quiz/Mid/Final' },
    { id: 'leave', icon: 'calendar', label: 'Leave Requests', color: '#8b5cf6', desc: `${stats.pendingLeaves} Pending` },
    { id: 'students', icon: 'people', label: 'My Students', color: '#14b8a6', desc: `${students?.length || 0} Total` },
    { id: 'timetable', icon: 'time', label: 'My Schedule', color: '#ec4899', desc: 'View Timetable' },
  ];

  return (
    <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Welcome Card */}
      <LinearGradient colors={['#0f172a', '#1e3a5f']} style={styles.teacherWelcome}>
        <View style={styles.teacherWelcomeContent}>
          <View style={styles.teacherAvatar}>
            <Text style={styles.teacherAvatarText}>{user?.name?.charAt(0)}</Text>
          </View>
          <View style={styles.teacherInfo}>
            <Text style={styles.teacherName}>{user?.name}</Text>
            <Text style={styles.teacherDept}>{user?.designation || 'Professor'}</Text>
            <Text style={styles.teacherDept}>{user?.department}</Text>
          </View>
        </View>
        <View style={styles.teacherStats}>
          <View style={styles.teacherStat}>
            <Text style={styles.teacherStatValue}>{students?.length || 0}</Text>
            <Text style={styles.teacherStatLabel}>Students</Text>
          </View>
          <View style={styles.teacherStatDivider} />
          <View style={styles.teacherStat}>
            <Text style={styles.teacherStatValue}>{user?.subjects || 3}</Text>
            <Text style={styles.teacherStatLabel}>Subjects</Text>
          </View>
          <View style={styles.teacherStatDivider} />
          <View style={styles.teacherStat}>
            <Text style={styles.teacherStatValue}>{stats.todayAttendance}</Text>
            <Text style={styles.teacherStatLabel}>Present Today</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity key={action.id} style={styles.actionCard} onPress={() => setCurrentScreen(action.id)}>
            <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
              <Ionicons name={action.icon} size={24} color={action.color} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
            <Text style={styles.actionDesc}>{action.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Today's Schedule */}
      <Text style={styles.sectionTitle}>Today's Classes</Text>
      {(data?.todayClasses || []).length > 0 ? (
        data.todayClasses.slice(0, 3).map((cls, i) => (
          <View key={i} style={styles.classCard}>
            <View style={styles.classTime}>
              <Text style={styles.classTimeText}>{cls.startTime}</Text>
              <Text style={styles.classTimeDivider}>to</Text>
              <Text style={styles.classTimeText}>{cls.endTime}</Text>
            </View>
            <View style={styles.classInfo}>
              <Text style={styles.className}>{cls.subjectName}</Text>
              <Text style={styles.classRoom}>{cls.room}</Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={40} color={colors.gray[300]} />
          <Text style={styles.emptyText}>No classes scheduled today</Text>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ============================================
// TEACHER ATTENDANCE SCREEN - QR & MANUAL
// ============================================
function TeacherAttendanceScreen({ user, students, loadData }) {
  const [mode, setMode] = useState('manual'); // 'manual' or 'qr'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState({});
  const [qrSession, setQrSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await fetch(`${API_URL}/subjects`);
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
        if (data.length > 0) setSelectedSubject(data[0].id);
      }
    } catch (e) {
      console.log('Subjects fetch error');
    }
  };

  const generateQR = async () => {
    if (!selectedSubject) {
      Alert.alert('Error', 'Please select a subject');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/qr-attendance/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: user.id, subjectId: selectedSubject, validMinutes: 15 })
      });
      if (res.ok) {
        const data = await res.json();
        setQrSession(data.session);
        Alert.alert('Success', `QR Code generated! Valid for 15 minutes.\nCode: ${data.session.code}`);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = (studentId, status) => {
    setAttendanceData(prev => ({ ...prev, [studentId]: status }));
  };

  const submitAttendance = async () => {
    const records = Object.entries(attendanceData).map(([studentId, status]) => ({ studentId, status }));
    
    if (records.length === 0) {
      Alert.alert('Error', 'Please mark attendance for at least one student');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, attendanceRecords: records })
      });
      if (res.ok) {
        Alert.alert('Success', 'Attendance submitted successfully!');
        setAttendanceData({});
        loadData();
      }
    } catch (e) {
      Alert.alert('Error', 'Could not submit attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.scrollView}>
      {/* Mode Toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity style={[styles.modeBtn, mode === 'manual' && styles.modeBtnActive]} onPress={() => setMode('manual')}>
          <Ionicons name="list" size={20} color={mode === 'manual' ? '#fff' : colors.primary} />
          <Text style={[styles.modeBtnText, mode === 'manual' && styles.modeBtnTextActive]}>Manual</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeBtn, mode === 'qr' && styles.modeBtnActive]} onPress={() => setMode('qr')}>
          <Ionicons name="qr-code" size={20} color={mode === 'qr' ? '#fff' : colors.primary} />
          <Text style={[styles.modeBtnText, mode === 'qr' && styles.modeBtnTextActive]}>QR Code</Text>
        </TouchableOpacity>
      </View>

      {mode === 'qr' ? (
        <View style={styles.qrContainer}>
          {/* Subject Selector */}
          <Text style={styles.inputLabel}>Select Subject</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            {subjects.map(sub => (
              <TouchableOpacity 
                key={sub.id} 
                style={[styles.subjectChip, selectedSubject === sub.id && styles.subjectChipActive]}
                onPress={() => setSelectedSubject(sub.id)}
              >
                <Text style={[styles.subjectChipText, selectedSubject === sub.id && styles.subjectChipTextActive]}>
                  {sub.code}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {qrSession ? (
            <View style={styles.qrCodeCard}>
              <View style={styles.qrCodeBox}>
                <Ionicons name="qr-code" size={150} color={colors.primary} />
              </View>
              <Text style={styles.qrCodeText}>Code: {qrSession.code}</Text>
              <Text style={styles.qrCodeExpiry}>Expires: {new Date(qrSession.expiresAt).toLocaleTimeString()}</Text>
              <Text style={styles.qrCodeScanned}>{qrSession.scannedBy?.length || 0} students scanned</Text>
              <TouchableOpacity style={styles.regenerateBtn} onPress={generateQR}>
                <Ionicons name="refresh" size={20} color="#fff" />
                <Text style={styles.regenerateBtnText}>Generate New</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.generateQrBtn} onPress={generateQR} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="qr-code" size={40} color="#fff" />
                  <Text style={styles.generateQrBtnText}>Generate QR Code</Text>
                  <Text style={styles.generateQrBtnSub}>Students will scan to mark attendance</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          {/* Date Selector */}
          <View style={styles.dateRow}>
            <Text style={styles.inputLabel}>Date:</Text>
            <TextInput
              style={styles.dateInput}
              value={selectedDate}
              onChangeText={setSelectedDate}
              placeholder="YYYY-MM-DD"
            />
          </View>

          {/* Student List */}
          <FlatList
            data={students}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.attendanceItem}>
                <View style={styles.attendanceStudent}>
                  <View style={styles.studentAvatar}>
                    <Text style={styles.studentAvatarText}>{item.name?.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={styles.studentName}>{item.name}</Text>
                    <Text style={styles.studentRoll}>{item.rollNumber}</Text>
                  </View>
                </View>
                <View style={styles.attendanceButtons}>
                  {['present', 'absent', 'late'].map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.attBtn,
                        attendanceData[item.id] === status && styles.attBtnActive,
                        { backgroundColor: attendanceData[item.id] === status ? 
                          (status === 'present' ? '#22c55e' : status === 'absent' ? '#ef4444' : '#f59e0b') : 
                          colors.gray[100] 
                        }
                      ]}
                      onPress={() => markAttendance(item.id, status)}
                    >
                      <Text style={[styles.attBtnText, attendanceData[item.id] === status && { color: '#fff' }]}>
                        {status.charAt(0).toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            ListFooterComponent={
              <TouchableOpacity style={styles.submitAttBtn} onPress={submitAttendance} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitAttBtnText}>Submit Attendance</Text>}
              </TouchableOpacity>
            }
          />
        </>
      )}
    </View>
  );
}

// ============================================
// TEACHER ASSIGNMENTS SCREEN
// ============================================
function TeacherAssignmentsScreen({ user, loadData }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [formData, setFormData] = useState({ title: '', description: '', subjectId: '', dueDate: '', totalMarks: '20', type: 'assignment' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [assRes, subRes] = await Promise.all([
        fetch(`${API_URL}/assignments?teacherId=${user.id}`),
        fetch(`${API_URL}/subjects`)
      ]);
      if (assRes.ok) setAssignments(await assRes.json());
      if (subRes.ok) {
        const subs = await subRes.json();
        setSubjects(subs);
        if (subs.length > 0) setFormData(f => ({ ...f, subjectId: subs[0].id }));
      }
    } catch (e) {
      console.log('Fetch error');
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async () => {
    if (!formData.title || !formData.dueDate || !formData.subjectId) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, teacherId: user.id, totalMarks: parseInt(formData.totalMarks) })
      });
      if (res.ok) {
        Alert.alert('Success', 'Assignment created!');
        setShowForm(false);
        setFormData({ title: '', description: '', subjectId: subjects[0]?.id || '', dueDate: '', totalMarks: '20', type: 'assignment' });
        fetchData();
      }
    } catch (e) {
      Alert.alert('Error', 'Could not create assignment');
    }
  };

  if (loading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <ScrollView style={styles.scrollView}>
      <TouchableOpacity style={styles.applyButton} onPress={() => setShowForm(!showForm)}>
        <Ionicons name={showForm ? 'close' : 'add'} size={20} color="#fff" />
        <Text style={styles.applyButtonText}>{showForm ? 'Cancel' : 'Create Assignment'}</Text>
      </TouchableOpacity>

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>New Assignment</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput style={styles.formInput} placeholder="Assignment title" value={formData.title} onChangeText={t => setFormData({...formData, title: t})} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Subject *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {subjects.map(sub => (
                <TouchableOpacity key={sub.id} style={[styles.subjectChip, formData.subjectId === sub.id && styles.subjectChipActive]} onPress={() => setFormData({...formData, subjectId: sub.id})}>
                  <Text style={[styles.subjectChipText, formData.subjectId === sub.id && styles.subjectChipTextActive]}>{sub.code}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Type</Text>
            <View style={styles.formRow}>
              {['assignment', 'quiz', 'project', 'lab'].map(type => (
                <TouchableOpacity key={type} style={[styles.typeChip, formData.type === type && styles.typeChipActive]} onPress={() => setFormData({...formData, type})}>
                  <Text style={[styles.typeChipText, formData.type === type && styles.typeChipTextActive]}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Due Date *</Text>
              <TextInput style={styles.formInput} placeholder="YYYY-MM-DD" value={formData.dueDate} onChangeText={t => setFormData({...formData, dueDate: t})} />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Total Marks</Text>
              <TextInput style={styles.formInput} placeholder="20" value={formData.totalMarks} onChangeText={t => setFormData({...formData, totalMarks: t})} keyboardType="numeric" />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput style={[styles.formInput, { height: 80 }]} placeholder="Assignment details..." value={formData.description} onChangeText={t => setFormData({...formData, description: t})} multiline />
          </View>

          <TouchableOpacity style={styles.submitFormBtn} onPress={createAssignment}>
            <Text style={styles.submitFormBtnText}>Create Assignment</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>My Assignments ({assignments.length})</Text>
      {assignments.map((a, i) => (
        <View key={a.id || i} style={styles.assignmentCard}>
          <View style={styles.assignmentHeader}>
            <View style={[styles.assignmentType, { backgroundColor: a.type === 'project' ? '#8b5cf620' : a.type === 'quiz' ? '#f59e0b20' : '#3b82f620' }]}>
              <Text style={[styles.assignmentTypeText, { color: a.type === 'project' ? '#8b5cf6' : a.type === 'quiz' ? '#f59e0b' : '#3b82f6' }]}>{a.type?.toUpperCase()}</Text>
            </View>
            <Text style={styles.assignmentMarks}>{a.submissionCount || 0}/{a.totalStudents || 0} submitted</Text>
          </View>
          <Text style={styles.assignmentTitle}>{a.title}</Text>
          <Text style={styles.assignmentSubject}>{a.subjectCode} • {a.totalMarks} marks</Text>
          <Text style={[styles.assignmentDueText, a.isOverdue && { color: '#ef4444' }]}>
            {a.isOverdue ? 'Closed' : `Due: ${new Date(a.dueDate).toLocaleDateString()}`}
          </Text>
        </View>
      ))}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ============================================
// TEACHER MARKS SCREEN
// ============================================
function TeacherMarksScreen({ user, students, loadData }) {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [examType, setExamType] = useState('quiz1');
  const [maxMarks, setMaxMarks] = useState('10');
  const [marksData, setMarksData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await fetch(`${API_URL}/subjects`);
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
        if (data.length > 0) setSelectedSubject(data[0].id);
      }
    } catch (e) {
      console.log('Subjects fetch error');
    }
  };

  const updateMarks = (studentId, marks) => {
    setMarksData(prev => ({ ...prev, [studentId]: marks }));
  };

  const submitMarks = async () => {
    const records = Object.entries(marksData)
      .filter(([_, marks]) => marks !== '')
      .map(([studentId, obtainedMarks]) => ({
        studentId,
        subjectId: selectedSubject,
        examType,
        maxMarks: parseInt(maxMarks),
        obtainedMarks: parseInt(obtainedMarks)
      }));

    if (records.length === 0) {
      Alert.alert('Error', 'Please enter marks for at least one student');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/marks/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marks: records, addedBy: user.id })
      });
      if (res.ok) {
        Alert.alert('Success', 'Marks submitted successfully!');
        setMarksData({});
        loadData();
      }
    } catch (e) {
      Alert.alert('Error', 'Could not submit marks');
    } finally {
      setLoading(false);
    }
  };

  const examTypes = [
    { id: 'quiz1', label: 'Quiz 1', max: 10 },
    { id: 'quiz2', label: 'Quiz 2', max: 10 },
    { id: 'assignment1', label: 'Assignment 1', max: 10 },
    { id: 'midterm', label: 'Midterm', max: 30 },
    { id: 'final', label: 'Final', max: 50 },
  ];

  return (
    <View style={styles.scrollView}>
      {/* Subject Selector */}
      <Text style={styles.inputLabel}>Select Subject</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {subjects.map(sub => (
          <TouchableOpacity key={sub.id} style={[styles.subjectChip, selectedSubject === sub.id && styles.subjectChipActive]} onPress={() => setSelectedSubject(sub.id)}>
            <Text style={[styles.subjectChipText, selectedSubject === sub.id && styles.subjectChipTextActive]}>{sub.code}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Exam Type */}
      <Text style={styles.inputLabel}>Exam Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {examTypes.map(exam => (
          <TouchableOpacity key={exam.id} style={[styles.subjectChip, examType === exam.id && styles.subjectChipActive]} onPress={() => { setExamType(exam.id); setMaxMarks(exam.max.toString()); }}>
            <Text style={[styles.subjectChipText, examType === exam.id && styles.subjectChipTextActive]}>{exam.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Max Marks */}
      <View style={styles.maxMarksRow}>
        <Text style={styles.inputLabel}>Max Marks:</Text>
        <TextInput style={styles.maxMarksInput} value={maxMarks} onChangeText={setMaxMarks} keyboardType="numeric" />
      </View>

      {/* Students List */}
      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.marksItem}>
            <View style={styles.marksStudent}>
              <Text style={styles.studentName}>{item.name}</Text>
              <Text style={styles.studentRoll}>{item.rollNumber}</Text>
            </View>
            <View style={styles.marksInputWrapper}>
              <TextInput
                style={styles.marksInput}
                placeholder="0"
                value={marksData[item.id] || ''}
                onChangeText={(text) => updateMarks(item.id, text)}
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={styles.marksMax}>/ {maxMarks}</Text>
            </View>
          </View>
        )}
        ListFooterComponent={
          <TouchableOpacity style={styles.submitAttBtn} onPress={submitMarks} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitAttBtnText}>Submit Marks</Text>}
          </TouchableOpacity>
        }
      />
    </View>
  );
}

// ============================================
// TEACHER LEAVE SCREEN
// ============================================
function TeacherLeaveScreen({ user, loadData }) {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await fetch(`${API_URL}/leave`);
      if (res.ok) {
        const data = await res.json();
        setLeaves(data);
      }
    } catch (e) {
      console.log('Leave fetch error');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async (leaveId, status, rejectionReason = '') => {
    try {
      const res = await fetch(`${API_URL}/leave/${leaveId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, approvedBy: user.id, rejectionReason })
      });
      if (res.ok) {
        Alert.alert('Success', `Leave ${status}`);
        fetchLeaves();
      }
    } catch (e) {
      Alert.alert('Error', 'Could not update leave');
    }
  };

  if (loading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const pending = leaves.filter(l => l.status === 'pending');
  const processed = leaves.filter(l => l.status !== 'pending');

  return (
    <ScrollView style={styles.scrollView}>
      <Text style={styles.sectionTitle}>Pending Requests ({pending.length})</Text>
      {pending.map((leave, i) => (
        <View key={leave.id || i} style={styles.leaveRequestCard}>
          <View style={styles.leaveRequestHeader}>
            <View>
              <Text style={styles.leaveRequestName}>{leave.studentName}</Text>
              <Text style={styles.leaveRequestRoll}>{leave.rollNumber}</Text>
            </View>
            <View style={[styles.leaveType, { backgroundColor: leave.leaveType === 'sick' ? '#ef444420' : '#3b82f620' }]}>
              <Text style={[styles.leaveTypeText, { color: leave.leaveType === 'sick' ? '#ef4444' : '#3b82f6' }]}>{leave.leaveType?.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.leaveDates}>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()} ({leave.days} days)</Text>
          <Text style={styles.leaveReason}>{leave.reason}</Text>
          <View style={styles.leaveActions}>
            <TouchableOpacity style={[styles.leaveActionBtn, { backgroundColor: '#22c55e' }]} onPress={() => handleLeave(leave.id, 'approved')}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.leaveActionText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.leaveActionBtn, { backgroundColor: '#ef4444' }]} onPress={() => handleLeave(leave.id, 'rejected', 'Not approved')}>
              <Ionicons name="close" size={18} color="#fff" />
              <Text style={styles.leaveActionText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {pending.length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-circle" size={50} color="#22c55e" />
          <Text style={styles.emptyText}>No pending leave requests</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Processed ({processed.length})</Text>
      {processed.slice(0, 10).map((leave, i) => (
        <View key={leave.id || i} style={styles.leaveCard}>
          <View style={styles.leaveHeader}>
            <Text style={styles.studentName}>{leave.studentName}</Text>
            <View style={[styles.leaveStatus, { backgroundColor: leave.status === 'approved' ? '#22c55e20' : '#ef444420' }]}>
              <Text style={[styles.leaveStatusText, { color: leave.status === 'approved' ? '#22c55e' : '#ef4444' }]}>{leave.status?.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.leaveDates}>{leave.days} days • {leave.leaveType}</Text>
        </View>
      ))}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ============================================
// TEACHER STUDENTS SCREEN
// ============================================
function TeacherStudentsScreen({ user, students }) {
  const [search, setSearch] = useState('');

  const filtered = students.filter(s => 
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.scrollView}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={colors.gray[400]} />
        <TextInput style={styles.searchInput} placeholder="Search students..." value={search} onChangeText={setSearch} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.studentCard}>
            <View style={styles.studentAvatar}>
              <Text style={styles.studentAvatarText}>{item.name?.charAt(0)}</Text>
            </View>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{item.name}</Text>
              <Text style={styles.studentRoll}>{item.rollNumber} • Sem {item.semester}</Text>
              <Text style={styles.studentEmail}>{item.email}</Text>
            </View>
            <View style={styles.studentCgpa}>
              <Text style={styles.studentCgpaValue}>{item.cgpa || '0.00'}</Text>
              <Text style={styles.studentCgpaLabel}>CGPA</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={50} color={colors.gray[300]} />
            <Text style={styles.emptyText}>No students found</Text>
          </View>
        }
      />
    </View>
  );
}

// ============================================
// TEACHER TIMETABLE SCREEN
// ============================================
function TeacherTimetableScreen({ user }) {
  const [timetable, setTimetable] = useState({ grouped: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      const res = await fetch(`${API_URL}/timetable?teacherId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        // Group by day
        const grouped = {};
        data.forEach(slot => {
          if (!grouped[slot.day]) grouped[slot.day] = [];
          grouped[slot.day].push(slot);
        });
        setTimetable({ grouped });
      }
    } catch (e) {
      console.log('Timetable fetch error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const days = Object.keys(timetable.grouped);

  return (
    <ScrollView style={styles.scrollView}>
      {days.map(day => (
        <View key={day}>
          <Text style={styles.dayTitle}>{day}</Text>
          {timetable.grouped[day].map((slot, i) => (
            <View key={i} style={styles.timetableSlot}>
              <View style={styles.slotTime}>
                <Text style={styles.slotTimeText}>{slot.startTime}</Text>
                <Text style={styles.slotTimeDivider}>-</Text>
                <Text style={styles.slotTimeText}>{slot.endTime}</Text>
              </View>
              <View style={styles.slotInfo}>
                <Text style={styles.slotSubject}>{slot.subjectName}</Text>
                <Text style={styles.slotMeta}>{slot.room} • Sem {slot.semester}</Text>
              </View>
            </View>
          ))}
        </View>
      ))}
      {days.length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={50} color={colors.gray[300]} />
          <Text style={styles.emptyText}>No schedule available</Text>
        </View>
      )}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ============================================
// TEACHER PROFILE SCREEN
// ============================================
function TeacherProfileScreen({ user, onLogout }) {
  return (
    <ScrollView style={styles.scrollView}>
      <LinearGradient colors={['#0f172a', '#1e3a5f']} style={styles.profileCardLarge}>
        <View style={styles.profileAvatarLarge}>
          <Text style={styles.profileAvatarTextLarge}>{user?.name?.charAt(0)}</Text>
        </View>
        <Text style={styles.profileNameLarge}>{user?.name}</Text>
        <Text style={styles.profileEmailLarge}>{user?.email}</Text>
        <View style={styles.profileBadges}>
          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeText}>{user?.designation || 'Professor'}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.infoGrid}>
        <View style={styles.infoCard}>
          <Ionicons name="school-outline" size={24} color={colors.primary} />
          <Text style={styles.infoLabel}>Department</Text>
          <Text style={styles.infoValue}>{user?.department || 'N/A'}</Text>
        </View>
        <View style={styles.infoCard}>
          <Ionicons name="book-outline" size={24} color="#f59e0b" />
          <Text style={styles.infoLabel}>Subjects</Text>
          <Text style={styles.infoValue}>{user?.subjects || 3}</Text>
        </View>
        <View style={styles.infoCard}>
          <Ionicons name="call-outline" size={24} color="#22c55e" />
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>{user?.phone || 'N/A'}</Text>
        </View>
        <View style={styles.infoCard}>
          <Ionicons name="ribbon-outline" size={24} color="#8b5cf6" />
          <Text style={styles.infoLabel}>Qualification</Text>
          <Text style={styles.infoValue}>{user?.qualification || 'PhD'}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={22} color="#ef4444" />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ============================================
// STUDENT APP
// ============================================
function StudentApp({ user, data, announcements, onLogout, onRefresh, refreshing, currentScreen, setCurrentScreen }) {
  
  const screenTitles = {
    dashboard: `Hi, ${user?.name?.split(' ')[0]}`,
    attendance: 'My Attendance',
    results: 'My Results',
    timetable: 'Timetable',
    announcements: 'Announcements',
    assignments: 'Assignments',
    leave: 'Leave Applications',
    courses: 'My Courses',
    profile: 'My Profile'
  };

  const renderScreen = () => {
    switch(currentScreen) {
      case 'attendance':
        return <StudentAttendanceScreen user={user} />;
      case 'results':
        return <StudentResultsScreen user={user} />;
      case 'timetable':
        return <StudentTimetableScreen user={user} data={data} />;
      case 'announcements':
        return <AnnouncementsScreen announcements={announcements} isAdmin={false} />;
      case 'assignments':
        return <StudentAssignmentsScreen user={user} />;
      case 'leave':
        return <StudentLeaveScreen user={user} />;
      case 'courses':
        return <StudentCoursesScreen user={user} />;
      case 'profile':
        return <StudentProfileScreen user={user} onLogout={onLogout} />;
      default:
        return <StudentDashboard user={user} data={data} announcements={announcements} onRefresh={onRefresh} refreshing={refreshing} setCurrentScreen={setCurrentScreen} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
          <Ionicons name={currentScreen === 'dashboard' ? 'person-circle' : 'arrow-back'} size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{screenTitles[currentScreen] || 'Dashboard'}</Text>
        <TouchableOpacity onPress={() => setCurrentScreen('profile')}>
          <Ionicons name={currentScreen === 'profile' ? 'settings' : 'settings-outline'} size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {renderScreen()}

      {/* Bottom Navigation - 5 main tabs */}
      <View style={styles.bottomNav}>
        {[
          { id: 'dashboard', icon: 'home', label: 'Home' },
          { id: 'assignments', icon: 'document-text', label: 'Tasks' },
          { id: 'attendance', icon: 'calendar-number', label: 'Attend' },
          { id: 'results', icon: 'school', label: 'Results' },
          { id: 'courses', icon: 'book', label: 'Courses' },
        ].map((item) => (
          <TouchableOpacity key={item.id} style={styles.bottomNavItem} onPress={() => setCurrentScreen(item.id)}>
            <Ionicons name={currentScreen === item.id ? item.icon : `${item.icon}-outline`} size={22} color={currentScreen === item.id ? colors.primary : colors.gray[400]} />
            <Text style={[styles.bottomNavLabel, currentScreen === item.id && styles.bottomNavLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

// ============================================
// STUDENT DASHBOARD
// ============================================
function StudentDashboard({ user, data, announcements, onRefresh, refreshing, setCurrentScreen }) {
  const student = data?.student || {};
  const attendance = data?.attendance || {};
  const academics = data?.academics || {};
  const fees = data?.fees || {};

  return (
    <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Profile Card */}
      <LinearGradient colors={['#0f172a', '#1e3a5f']} style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>{user?.name?.charAt(0)}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name}</Text>
          <Text style={styles.profileMeta}>{user?.rollNumber}</Text>
          <Text style={styles.profileMeta}>{user?.department} • Sem {user?.semester}</Text>
        </View>
        <View style={styles.cgpaBadge}>
          <Text style={styles.cgpaLabel}>CGPA</Text>
          <Text style={styles.cgpaValue}>{student.cgpa || user?.cgpa || '0.00'}</Text>
        </View>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsRow}>
        <TouchableOpacity style={[styles.statCard, { borderLeftColor: '#22c55e' }]} onPress={() => setCurrentScreen('attendance')}>
          <Ionicons name="checkmark-circle" size={28} color="#22c55e" />
          <Text style={styles.statValue}>{attendance.percentage || 0}%</Text>
          <Text style={styles.statLabel}>Attendance</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.statCard, { borderLeftColor: '#3b82f6' }]} onPress={() => setCurrentScreen('results')}>
          <Ionicons name="school" size={28} color="#3b82f6" />
          <Text style={styles.statValue}>{academics.percentage || 0}%</Text>
          <Text style={styles.statLabel}>Performance</Text>
        </TouchableOpacity>
        <View style={[styles.statCard, { borderLeftColor: fees.status === 'paid' ? '#22c55e' : '#f59e0b' }]}>
          <Ionicons name="cash" size={28} color={fees.status === 'paid' ? '#22c55e' : '#f59e0b'} />
          <Text style={styles.statValue}>{fees.status === 'paid' ? '✓' : 'Due'}</Text>
          <Text style={styles.statLabel}>Fee</Text>
        </View>
      </View>

      {/* Today's Classes */}
      <Text style={styles.sectionTitle}>Today's Classes</Text>
      {(data?.todayClasses || []).length > 0 ? (
        data.todayClasses.map((cls, i) => (
          <View key={i} style={styles.classCard}>
            <View style={styles.classTime}>
              <Text style={styles.classTimeText}>{cls.startTime}</Text>
              <Text style={styles.classTimeDivider}>to</Text>
              <Text style={styles.classTimeText}>{cls.endTime}</Text>
            </View>
            <View style={styles.classInfo}>
              <Text style={styles.className}>{cls.subjectName}</Text>
              <Text style={styles.classRoom}>{cls.room}</Text>
            </View>
            <View style={[styles.classType, { backgroundColor: cls.type === 'lab' ? '#14b8a620' : '#3b82f620' }]}>
              <Text style={[styles.classTypeText, { color: cls.type === 'lab' ? '#14b8a6' : '#3b82f6' }]}>
                {cls.type?.toUpperCase()}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={40} color={colors.gray[300]} />
          <Text style={styles.emptyText}>No classes today</Text>
        </View>
      )}

      {/* Announcements */}
      <Text style={styles.sectionTitle}>Announcements</Text>
      {announcements.slice(0, 3).map((ann, i) => (
        <TouchableOpacity key={ann.id || i} style={styles.announcementItem} onPress={() => setCurrentScreen('announcements')}>
          <Ionicons name="megaphone" size={20} color={ann.priority === 'high' ? '#ef4444' : '#14b8a6'} />
          <View style={styles.announcementItemContent}>
            <Text style={styles.announcementItemTitle} numberOfLines={1}>{ann.title}</Text>
            <Text style={styles.announcementItemDate}>{ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : 'Recent'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
        </TouchableOpacity>
      ))}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ============================================
// STUDENT ATTENDANCE SCREEN
// ============================================
function StudentAttendanceScreen({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const res = await fetch(`${API_URL}/attendance/student/${user.id}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (e) {
      console.log('Attendance fetch error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const summary = data?.summary || {};
  const records = data?.records || [];

  return (
    <ScrollView style={styles.scrollView}>
      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Attendance Summary</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{summary.totalDays || 0}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: '#22c55e' }]}>{summary.presentDays || 0}</Text>
            <Text style={styles.summaryLabel}>Present</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: '#ef4444' }]}>{summary.absentDays || 0}</Text>
            <Text style={styles.summaryLabel}>Absent</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>{summary.lateDays || 0}</Text>
            <Text style={styles.summaryLabel}>Late</Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${summary.percentage || 0}%`, backgroundColor: (summary.percentage || 0) >= 75 ? '#22c55e' : '#ef4444' }]} />
        </View>
        <Text style={styles.progressText}>{summary.percentage || 0}% Attendance</Text>
        {(summary.percentage || 0) < 75 && (
          <Text style={styles.warningText}>⚠️ Attendance below 75% - Risk of detention</Text>
        )}
      </View>

      {/* Records */}
      <Text style={styles.sectionTitle}>Recent Records</Text>
      {records.slice(0, 20).map((record, i) => (
        <View key={record.id || i} style={styles.recordItem}>
          <Text style={styles.recordDate}>{record.date ? new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'N/A'}</Text>
          <View style={[styles.recordStatus, { backgroundColor: record.status === 'present' ? '#22c55e20' : record.status === 'absent' ? '#ef444420' : '#f59e0b20' }]}>
            <Text style={[styles.recordStatusText, { color: record.status === 'present' ? '#22c55e' : record.status === 'absent' ? '#ef4444' : '#f59e0b' }]}>
              {record.status?.toUpperCase()}
            </Text>
          </View>
        </View>
      ))}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ============================================
// STUDENT RESULTS SCREEN
// ============================================
function StudentResultsScreen({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const res = await fetch(`${API_URL}/marks/student/${user.id}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (e) {
      console.log('Results fetch error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const summary = data?.summary || {};
  const subjects = data?.subjects || [];

  const getGradeColor = (grade) => {
    if (grade?.startsWith('A')) return '#22c55e';
    if (grade?.startsWith('B')) return '#3b82f6';
    if (grade?.startsWith('C')) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <ScrollView style={styles.scrollView}>
      {/* CGPA Card */}
      <LinearGradient colors={['#0f172a', '#1e3a5f']} style={styles.cgpaCard}>
        <View style={styles.cgpaMain}>
          <Text style={styles.cgpaMainLabel}>CGPA</Text>
          <Text style={styles.cgpaMainValue}>{summary.cgpa || '0.00'}</Text>
        </View>
        <View style={styles.cgpaStats}>
          <View style={styles.cgpaStat}>
            <Text style={styles.cgpaStatValue}>{summary.totalSubjects || 0}</Text>
            <Text style={styles.cgpaStatLabel}>Subjects</Text>
          </View>
          <View style={styles.cgpaStat}>
            <Text style={styles.cgpaStatValue}>{summary.percentage || 0}%</Text>
            <Text style={styles.cgpaStatLabel}>Overall</Text>
          </View>
          <View style={styles.cgpaStat}>
            <Text style={styles.cgpaStatValue}>{summary.totalCredits || 0}</Text>
            <Text style={styles.cgpaStatLabel}>Credits</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Subjects */}
      <Text style={styles.sectionTitle}>Subject Results</Text>
      {subjects.map((subject, i) => (
        <View key={i} style={styles.subjectCard}>
          <View style={styles.subjectHeader}>
            <View>
              <Text style={styles.subjectName}>{subject.subjectName}</Text>
              <Text style={styles.subjectCode}>{subject.subjectCode} • {subject.creditHours} Credits</Text>
            </View>
            <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(subject.grade) + '20' }]}>
              <Text style={[styles.gradeText, { color: getGradeColor(subject.grade) }]}>{subject.grade}</Text>
            </View>
          </View>
          <View style={styles.subjectMarks}>
            <Text style={styles.marksText}>Obtained: {subject.totalObtained}/{subject.totalMax}</Text>
            <Text style={styles.marksText}>Percentage: {subject.percentage}%</Text>
            <Text style={styles.marksText}>GPA: {subject.gpa}</Text>
          </View>
        </View>
      ))}

      {subjects.length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="school-outline" size={50} color={colors.gray[300]} />
          <Text style={styles.emptyText}>No results available</Text>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ============================================
// STUDENT TIMETABLE SCREEN
// ============================================
function StudentTimetableScreen({ user, data }) {
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      const res = await fetch(`${API_URL}/timetable/student/${user.id}`);
      if (res.ok) {
        const result = await res.json();
        setTimetable(result);
      }
    } catch (e) {
      console.log('Timetable fetch error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const grouped = timetable?.grouped || {};
  const days = Object.keys(grouped);

  return (
    <ScrollView style={styles.scrollView}>
      {days.map(day => (
        <View key={day}>
          <Text style={styles.dayTitle}>{day}</Text>
          {grouped[day].map((slot, i) => (
            <View key={i} style={styles.timetableSlot}>
              <View style={styles.slotTime}>
                <Text style={styles.slotTimeText}>{slot.startTime}</Text>
                <Text style={styles.slotTimeDivider}>-</Text>
                <Text style={styles.slotTimeText}>{slot.endTime}</Text>
              </View>
              <View style={styles.slotInfo}>
                <Text style={styles.slotSubject}>{slot.subjectName}</Text>
                <Text style={styles.slotMeta}>{slot.teacherName} • {slot.room}</Text>
              </View>
              <View style={[styles.slotType, { backgroundColor: slot.type === 'lab' ? '#14b8a620' : '#3b82f620' }]}>
                <Text style={[styles.slotTypeText, { color: slot.type === 'lab' ? '#14b8a6' : '#3b82f6' }]}>
                  {slot.type?.toUpperCase()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ))}

      {days.length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={50} color={colors.gray[300]} />
          <Text style={styles.emptyText}>No timetable available</Text>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ============================================
// STUDENT ASSIGNMENTS SCREEN
// ============================================
function StudentAssignmentsScreen({ user }) {
  const [assignments, setAssignments] = useState({ pending: [], submitted: [], missed: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await fetch(`${API_URL}/assignments/student/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
      }
    } catch (e) {
      console.log('Assignments fetch error');
    } finally {
      setLoading(false);
    }
  };

  const submitAssignment = async (assignmentId) => {
    try {
      const res = await fetch(`${API_URL}/assignments/${assignmentId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: user.id, content: 'Submitted via app' })
      });
      if (res.ok) {
        Alert.alert('Success', 'Assignment submitted!');
        fetchAssignments();
      }
    } catch (e) {
      Alert.alert('Error', 'Could not submit assignment');
    }
  };

  if (loading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const tabs = [
    { id: 'pending', label: 'Pending', count: assignments.summary.pending || 0 },
    { id: 'submitted', label: 'Submitted', count: assignments.summary.submitted || 0 },
    { id: 'missed', label: 'Missed', count: assignments.summary.missed || 0 }
  ];

  const currentList = assignments[activeTab] || [];

  return (
    <View style={styles.scrollView}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map(tab => (
          <TouchableOpacity 
            key={tab.id} 
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label} ({tab.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={currentList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.assignmentCard}>
            <View style={styles.assignmentHeader}>
              <View style={[styles.assignmentType, { backgroundColor: item.type === 'project' ? '#8b5cf620' : item.type === 'quiz' ? '#f59e0b20' : '#3b82f620' }]}>
                <Text style={[styles.assignmentTypeText, { color: item.type === 'project' ? '#8b5cf6' : item.type === 'quiz' ? '#f59e0b' : '#3b82f6' }]}>
                  {item.type?.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.assignmentMarks}>{item.totalMarks} marks</Text>
            </View>
            <Text style={styles.assignmentTitle}>{item.title}</Text>
            <Text style={styles.assignmentSubject}>{item.subjectCode} - {item.subjectName}</Text>
            <View style={styles.assignmentFooter}>
              <View style={styles.assignmentDue}>
                <Ionicons name="time-outline" size={16} color={item.isOverdue ? '#ef4444' : colors.gray[500]} />
                <Text style={[styles.assignmentDueText, item.isOverdue && { color: '#ef4444' }]}>
                  {item.isOverdue ? 'Overdue' : `Due: ${new Date(item.dueDate).toLocaleDateString()}`}
                </Text>
              </View>
              {activeTab === 'pending' && !item.isOverdue && (
                <TouchableOpacity style={styles.submitBtn} onPress={() => submitAssignment(item.id)}>
                  <Text style={styles.submitBtnText}>Submit</Text>
                </TouchableOpacity>
              )}
              {item.submission && (
                <View style={[styles.statusBadge, { backgroundColor: item.submission.status === 'graded' ? '#22c55e20' : '#3b82f620' }]}>
                  <Text style={[styles.statusBadgeText, { color: item.submission.status === 'graded' ? '#22c55e' : '#3b82f6' }]}>
                    {item.submission.status === 'graded' ? `${item.submission.obtainedMarks}/${item.totalMarks}` : 'Submitted'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={50} color={colors.gray[300]} />
            <Text style={styles.emptyText}>No {activeTab} assignments</Text>
          </View>
        }
      />
    </View>
  );
}

// ============================================
// STUDENT LEAVE SCREEN
// ============================================
function StudentLeaveScreen({ user }) {
  const [leaves, setLeaves] = useState({ applications: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ startDate: '', endDate: '', reason: '', leaveType: 'casual' });

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await fetch(`${API_URL}/leave/student/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setLeaves(data);
      }
    } catch (e) {
      console.log('Leave fetch error');
    } finally {
      setLoading(false);
    }
  };

  const submitLeave = async () => {
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, studentId: user.id })
      });
      if (res.ok) {
        Alert.alert('Success', 'Leave application submitted!');
        setShowForm(false);
        setFormData({ startDate: '', endDate: '', reason: '', leaveType: 'casual' });
        fetchLeaves();
      }
    } catch (e) {
      Alert.alert('Error', 'Could not submit application');
    }
  };

  if (loading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const leaveTypes = ['casual', 'sick', 'emergency', 'academic'];

  return (
    <ScrollView style={styles.scrollView}>
      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Leave Summary</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: '#22c55e' }]}>{leaves.summary.approved || 0}</Text>
            <Text style={styles.summaryLabel}>Approved</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>{leaves.summary.pending || 0}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: '#ef4444' }]}>{leaves.summary.rejected || 0}</Text>
            <Text style={styles.summaryLabel}>Rejected</Text>
          </View>
        </View>
      </View>

      {/* Apply Button */}
      <TouchableOpacity style={styles.applyButton} onPress={() => setShowForm(!showForm)}>
        <Ionicons name={showForm ? 'close' : 'add'} size={20} color="#fff" />
        <Text style={styles.applyButtonText}>{showForm ? 'Cancel' : 'Apply for Leave'}</Text>
      </TouchableOpacity>

      {/* Leave Form */}
      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>New Leave Application</Text>
          
          <View style={styles.formRow}>
            {leaveTypes.map(type => (
              <TouchableOpacity 
                key={type}
                style={[styles.typeChip, formData.leaveType === type && styles.typeChipActive]}
                onPress={() => setFormData({...formData, leaveType: type})}
              >
                <Text style={[styles.typeChipText, formData.leaveType === type && styles.typeChipTextActive]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="2025-01-15"
              value={formData.startDate}
              onChangeText={(text) => setFormData({...formData, startDate: text})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>End Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="2025-01-17"
              value={formData.endDate}
              onChangeText={(text) => setFormData({...formData, endDate: text})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Reason</Text>
            <TextInput
              style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Enter reason for leave..."
              value={formData.reason}
              onChangeText={(text) => setFormData({...formData, reason: text})}
              multiline
            />
          </View>

          <TouchableOpacity style={styles.submitFormBtn} onPress={submitLeave}>
            <Text style={styles.submitFormBtnText}>Submit Application</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Leave History */}
      <Text style={styles.sectionTitle}>Leave History</Text>
      {leaves.applications.map((leave, i) => (
        <View key={leave.id || i} style={styles.leaveCard}>
          <View style={styles.leaveHeader}>
            <View style={[styles.leaveType, { backgroundColor: leave.leaveType === 'sick' ? '#ef444420' : '#3b82f620' }]}>
              <Text style={[styles.leaveTypeText, { color: leave.leaveType === 'sick' ? '#ef4444' : '#3b82f6' }]}>
                {leave.leaveType?.toUpperCase()}
              </Text>
            </View>
            <View style={[styles.leaveStatus, { 
              backgroundColor: leave.status === 'approved' ? '#22c55e20' : leave.status === 'rejected' ? '#ef444420' : '#f59e0b20' 
            }]}>
              <Text style={[styles.leaveStatusText, { 
                color: leave.status === 'approved' ? '#22c55e' : leave.status === 'rejected' ? '#ef4444' : '#f59e0b' 
              }]}>
                {leave.status?.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.leaveDates}>
            {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()} ({leave.days} days)
          </Text>
          <Text style={styles.leaveReason} numberOfLines={2}>{leave.reason}</Text>
        </View>
      ))}

      {leaves.applications.length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={50} color={colors.gray[300]} />
          <Text style={styles.emptyText}>No leave applications</Text>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ============================================
// STUDENT COURSES SCREEN
// ============================================
function StudentCoursesScreen({ user }) {
  const [courses, setCourses] = useState({ enrollments: [], summary: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await fetch(`${API_URL}/courses/student/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
      }
    } catch (e) {
      console.log('Courses fetch error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <ScrollView style={styles.scrollView}>
      {/* Summary */}
      <LinearGradient colors={['#0f172a', '#1e3a5f']} style={styles.coursesSummary}>
        <View style={styles.coursesStatItem}>
          <Text style={styles.coursesStatValue}>{courses.summary.totalCourses || 0}</Text>
          <Text style={styles.coursesStatLabel}>Courses</Text>
        </View>
        <View style={styles.coursesDivider} />
        <View style={styles.coursesStatItem}>
          <Text style={styles.coursesStatValue}>{courses.summary.totalCredits || 0}</Text>
          <Text style={styles.coursesStatLabel}>Credit Hours</Text>
        </View>
      </LinearGradient>

      <Text style={styles.sectionTitle}>Enrolled Courses</Text>

      {courses.enrollments.map((course, i) => (
        <View key={course.id || i} style={styles.courseCard}>
          <View style={styles.courseHeader}>
            <View style={styles.courseCode}>
              <Text style={styles.courseCodeText}>{course.subject?.code}</Text>
            </View>
            <Text style={styles.courseCredits}>{course.subject?.creditHours} CH</Text>
          </View>
          <Text style={styles.courseName}>{course.subject?.name}</Text>
          <View style={styles.courseDetails}>
            <View style={styles.courseDetail}>
              <Ionicons name="person-outline" size={14} color={colors.gray[500]} />
              <Text style={styles.courseDetailText}>{course.teacher || 'TBA'}</Text>
            </View>
            <View style={styles.courseDetail}>
              <Ionicons name="time-outline" size={14} color={colors.gray[500]} />
              <Text style={styles.courseDetailText}>{course.schedule || 'TBA'}</Text>
            </View>
            <View style={styles.courseDetail}>
              <Ionicons name="location-outline" size={14} color={colors.gray[500]} />
              <Text style={styles.courseDetailText}>{course.room || 'TBA'}</Text>
            </View>
          </View>
        </View>
      ))}

      {courses.enrollments.length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="book-outline" size={50} color={colors.gray[300]} />
          <Text style={styles.emptyText}>No courses enrolled</Text>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ============================================
// STUDENT PROFILE SCREEN
// ============================================
function StudentProfileScreen({ user, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (e) {
      console.log('Profile fetch error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const p = profile || user;

  const menuItems = [
    { icon: 'time-outline', label: 'Timetable', action: 'timetable' },
    { icon: 'megaphone-outline', label: 'Announcements', action: 'announcements' },
    { icon: 'calendar-outline', label: 'Leave History', action: 'leave' },
    { icon: 'help-circle-outline', label: 'Help & Support', action: 'help' },
  ];

  return (
    <ScrollView style={styles.scrollView}>
      {/* Profile Card */}
      <LinearGradient colors={['#0f172a', '#1e3a5f']} style={styles.profileCardLarge}>
        <View style={styles.profileAvatarLarge}>
          <Text style={styles.profileAvatarTextLarge}>{p.name?.charAt(0)}</Text>
        </View>
        <Text style={styles.profileNameLarge}>{p.name}</Text>
        <Text style={styles.profileEmailLarge}>{p.email}</Text>
        <View style={styles.profileBadges}>
          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeText}>{p.rollNumber}</Text>
          </View>
          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeText}>Semester {p.semester}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Info Cards */}
      <View style={styles.infoGrid}>
        <View style={styles.infoCard}>
          <Ionicons name="school-outline" size={24} color={colors.primary} />
          <Text style={styles.infoLabel}>Department</Text>
          <Text style={styles.infoValue}>{p.department || 'N/A'}</Text>
        </View>
        <View style={styles.infoCard}>
          <Ionicons name="trophy-outline" size={24} color="#f59e0b" />
          <Text style={styles.infoLabel}>CGPA</Text>
          <Text style={styles.infoValue}>{p.cgpa || '0.00'}</Text>
        </View>
        <View style={styles.infoCard}>
          <Ionicons name="call-outline" size={24} color="#22c55e" />
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>{p.phone || 'N/A'}</Text>
        </View>
        <View style={styles.infoCard}>
          <Ionicons name="cash-outline" size={24} color={p.feeStatus === 'paid' ? '#22c55e' : '#ef4444'} />
          <Text style={styles.infoLabel}>Fee Status</Text>
          <Text style={styles.infoValue}>{p.feeStatus?.toUpperCase() || 'N/A'}</Text>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={22} color="#ef4444" />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1, padding: 16 },
  screenContainer: { flex: 1, padding: 16 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Splash
  splashContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  splashContent: { alignItems: 'center' },
  splashLogo: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  splashTitle: { fontSize: 40, fontWeight: '800', color: '#fff' },
  splashSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.7)', marginTop: 8 },

  // Login
  loginContainer: { flex: 1 },
  loginSafe: { flex: 1 },
  loginScroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  loginContent: { width: '100%' },
  loginHeader: { alignItems: 'center', marginBottom: 32 },
  logoCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  loginTitle: { fontSize: 32, fontWeight: '700', color: '#fff' },
  loginSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  loginCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: colors.gray[700], marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray[100], borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 2, borderColor: 'transparent' },
  inputWrapperFocused: { borderColor: colors.primary, backgroundColor: '#fff' },
  input: { flex: 1, fontSize: 16, color: colors.text, marginLeft: 12 },
  loginButton: { marginTop: 8, borderRadius: 12, overflow: 'hidden' },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  loginButtonText: { fontSize: 18, fontWeight: '600', color: '#fff' },
  demoSection: { marginTop: 32, alignItems: 'center' },
  demoTitle: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: 16 },
  demoCredentials: { flexDirection: 'row', gap: 12 },
  demoCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, alignItems: 'center', minWidth: 90 },
  demoRole: { fontSize: 12, fontWeight: '600', color: '#fff', marginTop: 8 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.gray[200] },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },

  // Welcome Card
  welcomeCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 16, marginBottom: 16 },
  welcomeText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  welcomeSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  welcomeAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center' },
  welcomeAvatarText: { fontSize: 20, fontWeight: '700', color: colors.primary },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 8 },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },

  // Actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  actionCard: { width: (width - 56) / 2, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  actionIcon: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: colors.text },

  // Section
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12, marginTop: 8 },

  // List Items
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  listAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  listAvatarText: { fontSize: 18, fontWeight: '600', color: '#fff' },
  listInfo: { flex: 1 },
  listTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  listSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },

  // Bottom Nav
  bottomNav: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.gray[200], paddingVertical: 8, paddingBottom: 24 },
  bottomNavItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  bottomNavLabel: { fontSize: 10, color: colors.gray[400], marginTop: 4 },
  bottomNavLabelActive: { color: colors.primary, fontWeight: '600' },

  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 16, marginLeft: 12, color: colors.text },

  // Add Button
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 12, padding: 14, marginBottom: 16, gap: 8 },
  addButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  // Student Card
  studentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  studentAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  studentAvatarText: { fontSize: 20, fontWeight: '600', color: '#fff' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '600', color: colors.text },
  studentMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  studentActions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.gray[100], justifyContent: 'center', alignItems: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: height * 0.85 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.gray[200] },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  modalBody: { padding: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.gray[700], marginBottom: 8, marginTop: 12 },
  fieldInput: { backgroundColor: colors.gray[100], borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: colors.text },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 12, padding: 16, margin: 20, gap: 8 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  // Empty State
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 14, color: colors.gray[400], marginTop: 12 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 40, alignItems: 'center' },

  // Attendance
  dateCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, gap: 12 },
  dateText: { fontSize: 16, fontWeight: '600', color: colors.text },
  attendanceItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  attendanceBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  attendanceBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  floatingButton: { position: 'absolute', bottom: 100, left: 16, right: 16 },

  // Marks
  subjectScroll: { marginBottom: 16 },
  subjectChip: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.gray[100], borderRadius: 20, marginRight: 10 },
  subjectChipActive: { backgroundColor: colors.primary },
  subjectChipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  subjectChipTextActive: { color: '#fff' },
  marksConfig: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  configItem: { marginBottom: 12 },
  configLabel: { fontSize: 14, fontWeight: '600', color: colors.gray[700], marginBottom: 8 },
  examTypeRow: { flexDirection: 'row', gap: 10 },
  examTypeBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.gray[100], borderRadius: 8 },
  examTypeBtnActive: { backgroundColor: colors.primary },
  examTypeText: { fontSize: 14, fontWeight: '500', color: colors.text },
  examTypeTextActive: { color: '#fff' },
  maxMarksInput: { backgroundColor: colors.gray[100], borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, width: 100 },
  marksItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  marksInput: { width: 60, backgroundColor: colors.gray[100], borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, textAlign: 'center' },
  maxMarksLabel: { fontSize: 14, color: colors.gray[500], marginLeft: 8 },

  // Fees
  filterTabs: { flexDirection: 'row', marginBottom: 16 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.gray[100], borderRadius: 8, marginRight: 10 },
  filterTabActive: { backgroundColor: colors.primary },
  filterTabText: { fontSize: 14, fontWeight: '500', color: colors.text },
  filterTabTextActive: { color: '#fff' },
  feeCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  feeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feeName: { fontSize: 16, fontWeight: '600', color: colors.text },
  feeRoll: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  feeStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  feeStatusText: { fontSize: 11, fontWeight: '700' },
  feeDetails: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.gray[200] },
  feeDetail: { flex: 1 },
  feeDetailLabel: { fontSize: 11, color: colors.textSecondary },
  feeDetailValue: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 2 },

  // Announcements
  addForm: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  announcementCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  announcementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  announcementType: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  announcementDate: { fontSize: 12, color: colors.textSecondary },
  announcementTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  announcementContent: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  announcementItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, gap: 12 },
  announcementItemContent: { flex: 1 },
  announcementItemTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  announcementItemDate: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  // Profile Card
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 16, marginBottom: 16 },
  profileAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  profileAvatarText: { fontSize: 24, fontWeight: '700', color: colors.primary },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  profileMeta: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  cgpaBadge: { backgroundColor: colors.secondary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  cgpaLabel: { fontSize: 10, fontWeight: '600', color: colors.primary },
  cgpaValue: { fontSize: 20, fontWeight: '800', color: colors.primary },

  // Class Card
  classCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  classTime: { alignItems: 'center', marginRight: 14, width: 50 },
  classTimeText: { fontSize: 12, fontWeight: '600', color: colors.text },
  classTimeDivider: { fontSize: 10, color: colors.gray[400] },
  classInfo: { flex: 1 },
  className: { fontSize: 14, fontWeight: '600', color: colors.text },
  classRoom: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  classType: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  classTypeText: { fontSize: 10, fontWeight: '700' },

  // Summary
  summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16 },
  summaryTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  summaryStats: { flexDirection: 'row', marginBottom: 16 },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: '700', color: colors.text },
  summaryLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  progressBar: { height: 10, backgroundColor: colors.gray[200], borderRadius: 5, marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 5 },
  progressText: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center' },
  warningText: { fontSize: 12, color: '#ef4444', textAlign: 'center', marginTop: 8 },

  // Record
  recordItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  recordDate: { fontSize: 14, color: colors.text },
  recordStatus: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  recordStatusText: { fontSize: 12, fontWeight: '600' },

  // CGPA Card
  cgpaCard: { borderRadius: 16, padding: 24, marginBottom: 16 },
  cgpaMain: { alignItems: 'center', marginBottom: 20 },
  cgpaMainLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  cgpaMainValue: { fontSize: 48, fontWeight: '800', color: '#fff' },
  cgpaStats: { flexDirection: 'row' },
  cgpaStat: { flex: 1, alignItems: 'center' },
  cgpaStatValue: { fontSize: 20, fontWeight: '700', color: '#fff' },
  cgpaStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  // Subject Card
  subjectCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  subjectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subjectName: { fontSize: 16, fontWeight: '600', color: colors.text },
  subjectCode: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  gradeBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  gradeText: { fontSize: 16, fontWeight: '700' },
  subjectMarks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.gray[200] },
  marksText: { fontSize: 12, color: colors.textSecondary },

  // Timetable
  dayTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 12 },
  timetableSlot: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  slotTime: { alignItems: 'center', width: 60 },
  slotTimeText: { fontSize: 12, fontWeight: '600', color: colors.text },
  slotTimeDivider: { fontSize: 10, color: colors.gray[400] },
  slotInfo: { flex: 1, marginLeft: 12 },
  slotSubject: { fontSize: 14, fontWeight: '600', color: colors.text },
  slotMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  slotType: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  slotTypeText: { fontSize: 10, fontWeight: '700' },

  // Signup Styles
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.gray[200] },
  dividerText: { paddingHorizontal: 16, fontSize: 14, color: colors.gray[400], fontWeight: '500' },
  signupLink: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  signupLinkText: { fontSize: 15, color: colors.gray[600] },
  signupLinkBold: { fontSize: 15, fontWeight: '700', color: colors.primary },
  userTypeRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  userTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: colors.gray[100], borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  userTypeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  userTypeText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  userTypeTextActive: { color: '#fff' },

  // ============================================
  // NEW ADVANCED STYLES
  // ============================================

  // Tabs
  tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.gray[500] },
  tabTextActive: { color: '#fff' },

  // Assignment Card
  assignmentCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  assignmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  assignmentType: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  assignmentTypeText: { fontSize: 10, fontWeight: '700' },
  assignmentMarks: { fontSize: 13, fontWeight: '600', color: colors.gray[500] },
  assignmentTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  assignmentSubject: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  assignmentFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assignmentDue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assignmentDueText: { fontSize: 13, color: colors.gray[500] },
  submitBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  submitBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },

  // Leave Application
  applyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, marginBottom: 16 },
  applyButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  formCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16 },
  formTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  formRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.gray[100], borderWidth: 2, borderColor: 'transparent' },
  typeChipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  typeChipText: { fontSize: 13, fontWeight: '600', color: colors.gray[600] },
  typeChipTextActive: { color: colors.primary },
  formInput: { backgroundColor: colors.gray[100], borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: colors.text },
  submitFormBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitFormBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  leaveCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  leaveHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  leaveType: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  leaveTypeText: { fontSize: 10, fontWeight: '700' },
  leaveStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  leaveStatusText: { fontSize: 10, fontWeight: '700' },
  leaveDates: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 },
  leaveReason: { fontSize: 13, color: colors.textSecondary },

  // Courses
  coursesSummary: { flexDirection: 'row', borderRadius: 16, padding: 24, marginBottom: 16, alignItems: 'center', justifyContent: 'center' },
  coursesStatItem: { alignItems: 'center', flex: 1 },
  coursesStatValue: { fontSize: 32, fontWeight: '800', color: '#fff' },
  coursesStatLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  coursesDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 20 },
  courseCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  courseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  courseCode: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  courseCodeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  courseCredits: { fontSize: 14, fontWeight: '600', color: colors.gray[500] },
  courseName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  courseDetails: { gap: 8 },
  courseDetail: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  courseDetailText: { fontSize: 13, color: colors.textSecondary },

  // Profile
  profileCardLarge: { borderRadius: 20, padding: 30, alignItems: 'center', marginBottom: 20 },
  profileAvatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  profileAvatarTextLarge: { fontSize: 32, fontWeight: '700', color: '#fff' },
  profileNameLarge: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  profileEmailLarge: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 16 },
  profileBadges: { flexDirection: 'row', gap: 10 },
  profileBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  profileBadgeText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  infoCard: { width: (width - 44) / 2, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center' },
  infoLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 10, marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fef2f2', paddingVertical: 16, borderRadius: 14, borderWidth: 1, borderColor: '#fecaca' },
  logoutButtonText: { fontSize: 16, fontWeight: '600', color: '#ef4444' },

  // ============================================
  // TEACHER STYLES
  // ============================================
  
  // Teacher Welcome Card
  teacherWelcome: { borderRadius: 20, padding: 24, marginBottom: 20 },
  teacherWelcomeContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  teacherAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  teacherAvatarText: { fontSize: 24, fontWeight: '700', color: '#fff' },
  teacherInfo: { marginLeft: 16, flex: 1 },
  teacherName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  teacherDept: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  teacherStats: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  teacherStat: { alignItems: 'center' },
  teacherStatValue: { fontSize: 22, fontWeight: '700', color: '#fff' },
  teacherStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  teacherStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Action Grid
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  actionCard: { width: (width - 44) / 2, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center' },
  actionIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 },
  actionDesc: { fontSize: 12, color: colors.textSecondary },

  // Mode Toggle
  modeToggle: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 4, marginBottom: 16 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10 },
  modeBtnActive: { backgroundColor: colors.primary },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  modeBtnTextActive: { color: '#fff' },

  // QR Code
  qrContainer: { flex: 1 },
  qrCodeCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center' },
  qrCodeBox: { width: 200, height: 200, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  qrCodeText: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 },
  qrCodeExpiry: { fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
  qrCodeScanned: { fontSize: 16, fontWeight: '600', color: '#22c55e', marginBottom: 16 },
  regenerateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  regenerateBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  generateQrBtn: { backgroundColor: colors.primary, borderRadius: 20, padding: 40, alignItems: 'center' },
  generateQrBtnText: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 16 },
  generateQrBtnSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8 },

  // Subject Chips
  subjectChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.gray[100], marginRight: 10, borderWidth: 2, borderColor: 'transparent' },
  subjectChipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  subjectChipText: { fontSize: 13, fontWeight: '600', color: colors.gray[600] },
  subjectChipTextActive: { color: colors.primary },

  // Date Row
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  dateInput: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 },

  // Attendance Item
  attendanceItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8 },
  attendanceStudent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  studentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  studentAvatarText: { fontSize: 16, fontWeight: '600', color: colors.primary },
  attendanceButtons: { flexDirection: 'row', gap: 8 },
  attBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  attBtnActive: {},
  attBtnText: { fontSize: 14, fontWeight: '700', color: colors.gray[600] },
  submitAttBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 16, marginBottom: 100 },
  submitAttBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  // Marks
  maxMarksRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  maxMarksInput: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, width: 80, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  marksItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  marksStudent: { flex: 1 },
  marksInputWrapper: { flexDirection: 'row', alignItems: 'center' },
  marksInput: { width: 60, backgroundColor: colors.gray[100], borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  marksMax: { fontSize: 14, color: colors.gray[500], marginLeft: 8 },

  // Leave Request Card
  leaveRequestCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  leaveRequestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  leaveRequestName: { fontSize: 16, fontWeight: '600', color: colors.text },
  leaveRequestRoll: { fontSize: 13, color: colors.textSecondary },
  leaveActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  leaveActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  leaveActionText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // Search Bar
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: colors.text },

  // Student Card
  studentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10 },
  studentInfo: { flex: 1, marginLeft: 12 },
  studentName: { fontSize: 15, fontWeight: '600', color: colors.text },
  studentRoll: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  studentEmail: { fontSize: 12, color: colors.gray[400], marginTop: 2 },
  studentCgpa: { alignItems: 'center', backgroundColor: colors.primary + '10', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  studentCgpaValue: { fontSize: 16, fontWeight: '700', color: colors.primary },
  studentCgpaLabel: { fontSize: 10, color: colors.textSecondary },
});
