import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../context/AuthContext';
import { studentAPI, attendanceAPI, marksAPI, getPDFUrls } from '../../services/api';
import { colors, spacing, typography, shadows } from '../../theme';

const StudentDashboard = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [studentDetails, setStudentDetails] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [resultsSummary, setResultsSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [studentRes, attendanceRes, marksRes] = await Promise.all([
        studentAPI.getById(user.id),
        attendanceAPI.getByStudent(user.id),
        marksAPI.getByStudent(user.id),
      ]);

      setStudentDetails(studentRes.data);
      setAttendanceSummary(attendanceRes.data.summary);
      setResultsSummary(marksRes.data.summary);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const downloadPDF = async (type) => {
    try {
      let url;
      let filename;

      switch (type) {
        case 'details':
          url = getPDFUrls.studentDetails(user.id);
          filename = `student-details-${user.id}.pdf`;
          break;
        case 'attendance':
          const startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 3);
          url = getPDFUrls.attendance(
            user.id,
            startDate.toISOString().split('T')[0],
            new Date().toISOString().split('T')[0]
          );
          filename = `attendance-report-${user.id}.pdf`;
          break;
        case 'result':
          url = getPDFUrls.result(user.id);
          filename = `result-card-${user.id}.pdf`;
          break;
      }

      const downloadPath = `${FileSystem.documentDirectory}${filename}`;
      
      Alert.alert('Downloading', 'Generating your PDF...');
      
      const downloadResult = await FileSystem.downloadAsync(url, downloadPath);
      
      if (downloadResult.status === 200) {
        await Sharing.shareAsync(downloadResult.uri);
      } else {
        Alert.alert('Error', 'Failed to download PDF');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download PDF');
    }
  };

  const getAttendanceColor = (percentage) => {
    if (percentage >= 75) return colors.success;
    if (percentage >= 50) return colors.warning;
    return colors.error;
  };

  const getGradeColor = (grade) => {
    if (grade.startsWith('A')) return colors.success;
    if (grade.startsWith('B')) return colors.info;
    if (grade.startsWith('C')) return colors.warning;
    return colors.error;
  };

  const InfoCard = ({ icon, title, value, subtitle, color, onPress }) => (
    <TouchableOpacity
      style={styles.infoCard}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.infoIconContainer, { backgroundColor: color + '15' }]}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={[styles.infoValue, { color }]}>{value}</Text>
        {subtitle && <Text style={styles.infoSubtitle}>{subtitle}</Text>}
      </View>
      {onPress && (
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.gray[400]} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBackground}>
          <View style={styles.headerCircle1} />
          <View style={styles.headerCircle2} />
        </View>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Welcome,</Text>
              <Text style={styles.userName}>{user?.name || 'Student'}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <MaterialCommunityIcons name="logout" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>
          {studentDetails && (
            <View style={styles.studentBadge}>
              <Text style={styles.rollNumber}>{studentDetails.rollNumber}</Text>
              <Text style={styles.department}>
                {studentDetails.department} • Sem {studentDetails.semester}
              </Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Attendance</Text>
            <Text
              style={[
                styles.statValue,
                { color: getAttendanceColor(attendanceSummary?.percentage || 0) },
              ]}
            >
              {attendanceSummary?.percentage || 0}%
            </Text>
            <View style={styles.statMeta}>
              <Text style={styles.statMetaText}>
                {attendanceSummary?.presentDays || 0} of {attendanceSummary?.totalDays || 0} days
              </Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Overall Grade</Text>
            <Text
              style={[
                styles.statValue,
                { color: getGradeColor(resultsSummary?.overallGrade || 'N/A') },
              ]}
            >
              {resultsSummary?.overallGrade || 'N/A'}
            </Text>
            <View style={styles.statMeta}>
              <Text style={styles.statMetaText}>
                {resultsSummary?.overallPercentage || 0}%
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic Records</Text>

          <InfoCard
            icon="calendar-check"
            title="View Attendance"
            value={`${attendanceSummary?.presentDays || 0} Present`}
            subtitle="View detailed attendance report"
            color={colors.success}
            onPress={() => navigation.navigate('ViewAttendance')}
          />

          <InfoCard
            icon="clipboard-text"
            title="View Results"
            value={resultsSummary?.overallGrade || 'N/A'}
            subtitle="Check your exam results"
            color={colors.primary}
            onPress={() => navigation.navigate('ViewResults')}
          />
        </View>

        {/* Download PDFs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Download Reports</Text>

          <View style={styles.downloadGrid}>
            <TouchableOpacity
              style={styles.downloadCard}
              onPress={() => downloadPDF('details')}
            >
              <View style={[styles.downloadIcon, { backgroundColor: colors.info + '15' }]}>
                <MaterialCommunityIcons name="account-card-details" size={24} color={colors.info} />
              </View>
              <Text style={styles.downloadTitle}>Student Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.downloadCard}
              onPress={() => downloadPDF('attendance')}
            >
              <View style={[styles.downloadIcon, { backgroundColor: colors.success + '15' }]}>
                <MaterialCommunityIcons name="calendar-check" size={24} color={colors.success} />
              </View>
              <Text style={styles.downloadTitle}>Attendance Report</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.downloadCard}
              onPress={() => downloadPDF('result')}
            >
              <View style={[styles.downloadIcon, { backgroundColor: colors.secondary + '15' }]}>
                <MaterialCommunityIcons name="file-document" size={24} color={colors.secondary} />
              </View>
              <Text style={styles.downloadTitle}>Result Card</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Info */}
        {studentDetails && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Information</Text>
            <View style={styles.profileCard}>
              <View style={styles.profileRow}>
                <MaterialCommunityIcons name="email" size={20} color={colors.textLight} />
                <Text style={styles.profileText}>{studentDetails.email}</Text>
              </View>
              {studentDetails.phone && (
                <View style={styles.profileRow}>
                  <MaterialCommunityIcons name="phone" size={20} color={colors.textLight} />
                  <Text style={styles.profileText}>{studentDetails.phone}</Text>
                </View>
              )}
              {studentDetails.address && (
                <View style={styles.profileRow}>
                  <MaterialCommunityIcons name="map-marker" size={20} color={colors.textLight} />
                  <Text style={styles.profileText}>{studentDetails.address}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 220,
    position: 'relative',
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerCircle1: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -30,
    right: -30,
  },
  headerCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: 40,
    left: -20,
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  userName: {
    ...typography.h2,
    color: colors.white,
    marginTop: 4,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  rollNumber: {
    ...typography.h3,
    color: colors.white,
  },
  department: {
    ...typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    marginTop: -30,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.medium,
  },
  statLabel: {
    ...typography.bodySmall,
    color: colors.textLight,
  },
  statValue: {
    ...typography.h1,
    marginVertical: spacing.xs,
  },
  statMeta: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  statMetaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  infoTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  infoValue: {
    ...typography.bodySmall,
    fontWeight: '600',
    marginTop: 2,
  },
  infoSubtitle: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: 2,
  },
  downloadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  downloadCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.small,
  },
  downloadIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  downloadTitle: {
    ...typography.caption,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    ...shadows.small,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  profileText: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.md,
  },
});

export default StudentDashboard;

