import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { studentAPI, attendanceAPI, marksAPI, getPDFUrls } from '../../services/api';
import { colors, spacing, typography, shadows } from '../../theme';

const StudentDetailScreen = ({ route, navigation }) => {
  const { student: initialStudent } = route.params;
  const [student, setStudent] = useState(initialStudent);
  const [attendance, setAttendance] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [studentRes, attendanceRes, marksRes] = await Promise.all([
        studentAPI.getById(student.id),
        attendanceAPI.getByStudent(student.id),
        marksAPI.getByStudent(student.id),
      ]);

      setStudent(studentRes.data);
      setAttendance(attendanceRes.data);
      setResults(marksRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [student.id]);

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
          url = getPDFUrls.studentDetails(student.id);
          filename = `student-details-${student.rollNumber}.pdf`;
          break;
        case 'attendance':
          const startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 3);
          url = getPDFUrls.attendance(
            student.id,
            startDate.toISOString().split('T')[0],
            new Date().toISOString().split('T')[0]
          );
          filename = `attendance-report-${student.rollNumber}.pdf`;
          break;
        case 'result':
          url = getPDFUrls.result(student.id);
          filename = `result-card-${student.rollNumber}.pdf`;
          break;
      }

      Alert.alert('Downloading', 'Generating PDF...');
      
      const downloadPath = `${FileSystem.documentDirectory}${filename}`;
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
    if (!grade) return colors.gray[400];
    if (grade.startsWith('A')) return colors.success;
    if (grade.startsWith('B')) return colors.info;
    if (grade.startsWith('C')) return colors.warning;
    return colors.error;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student Profile</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditStudent', { student })}
        >
          <MaterialCommunityIcons name="pencil" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {student.name?.charAt(0)?.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.studentName}>{student.name}</Text>
          <Text style={styles.rollNumber}>{student.rollNumber}</Text>
          <View style={styles.badges}>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="office-building" size={14} color={colors.primary} />
              <Text style={styles.badgeText}>{student.department}</Text>
            </View>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="school" size={14} color={colors.primary} />
              <Text style={styles.badgeText}>Semester {student.semester}</Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Attendance</Text>
            <Text
              style={[
                styles.statValue,
                { color: getAttendanceColor(attendance?.summary?.percentage || 0) },
              ]}
            >
              {attendance?.summary?.percentage || 0}%
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Overall Grade</Text>
            <Text
              style={[
                styles.statValue,
                { color: getGradeColor(results?.summary?.overallGrade) },
              ]}
            >
              {results?.summary?.overallGrade || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="email" size={20} color={colors.textLight} />
              <Text style={styles.infoText}>{student.email}</Text>
            </View>
            {student.phone && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="phone" size={20} color={colors.textLight} />
                <Text style={styles.infoText}>{student.phone}</Text>
              </View>
            )}
            {student.address && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="map-marker" size={20} color={colors.textLight} />
                <Text style={styles.infoText}>{student.address}</Text>
              </View>
            )}
            {student.dateOfBirth && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar" size={20} color={colors.textLight} />
                <Text style={styles.infoText}>{student.dateOfBirth}</Text>
              </View>
            )}
            {student.gender && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="account" size={20} color={colors.textLight} />
                <Text style={styles.infoText}>{student.gender}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Download Reports */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Generate Reports</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => downloadPDF('details')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.info + '15' }]}>
                <MaterialCommunityIcons name="account-card-details" size={24} color={colors.info} />
              </View>
              <Text style={styles.actionTitle}>Student Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => downloadPDF('attendance')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.success + '15' }]}>
                <MaterialCommunityIcons name="calendar-check" size={24} color={colors.success} />
              </View>
              <Text style={styles.actionTitle}>Attendance Report</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => downloadPDF('result')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.secondary + '15' }]}>
                <MaterialCommunityIcons name="file-document" size={24} color={colors.secondary} />
              </View>
              <Text style={styles.actionTitle}>Result Card</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Attendance */}
        {attendance?.records?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Attendance</Text>
            {attendance.records.slice(0, 5).map((record) => {
              const statusColor = record.status === 'present' 
                ? colors.success 
                : record.status === 'late' 
                  ? colors.warning 
                  : colors.error;
              return (
                <View key={record.id} style={styles.attendanceItem}>
                  <Text style={styles.attendanceDate}>{record.date}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </Text>
                  </View>
                </View>
              );
            })}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.white,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.medium,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    ...typography.h1,
    color: colors.white,
  },
  studentName: {
    ...typography.h2,
    color: colors.text,
  },
  rollNumber: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 4,
  },
  badges: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    gap: spacing.xs,
  },
  badgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.small,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textLight,
  },
  statValue: {
    ...typography.h2,
    marginTop: 4,
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
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    ...shadows.small,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoText: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.md,
    flex: 1,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.small,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actionTitle: {
    ...typography.caption,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  attendanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  attendanceDate: {
    ...typography.body,
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 15,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
});

export default StudentDetailScreen;

