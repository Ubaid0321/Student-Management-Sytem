import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { studentAPI, attendanceAPI } from '../../services/api';
import { colors, spacing, typography, shadows } from '../../theme';

const MarkAttendanceScreen = ({ navigation }) => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [studentsRes, attendanceRes] = await Promise.all([
        studentAPI.getAll(),
        attendanceAPI.getAll({ date: selectedDate }),
      ]);

      setStudents(studentsRes.data);

      // Initialize attendance state
      const attendanceMap = {};
      studentsRes.data.forEach((student) => {
        const existingRecord = attendanceRes.data.find((a) => a.studentId === student.id);
        attendanceMap[student.id] = existingRecord?.status || 'unmarked';
      });
      setAttendance(attendanceMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleAttendance = (studentId) => {
    setAttendance((prev) => {
      const currentStatus = prev[studentId];
      let nextStatus;
      switch (currentStatus) {
        case 'unmarked':
          nextStatus = 'present';
          break;
        case 'present':
          nextStatus = 'absent';
          break;
        case 'absent':
          nextStatus = 'late';
          break;
        case 'late':
          nextStatus = 'present';
          break;
        default:
          nextStatus = 'present';
      }
      return { ...prev, [studentId]: nextStatus };
    });
  };

  const markAll = (status) => {
    const newAttendance = {};
    students.forEach((student) => {
      newAttendance[student.id] = status;
    });
    setAttendance(newAttendance);
  };

  const saveAttendance = async () => {
    const markedStudents = Object.entries(attendance).filter(
      ([_, status]) => status !== 'unmarked'
    );

    if (markedStudents.length === 0) {
      Alert.alert('No Attendance Marked', 'Please mark attendance for at least one student');
      return;
    }

    setSaving(true);
    try {
      const attendanceRecords = markedStudents.map(([studentId, status]) => ({
        studentId,
        status,
      }));

      await attendanceAPI.mark(selectedDate, attendanceRecords);
      Alert.alert('Success', `Attendance saved for ${markedStudents.length} students`);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return colors.success;
      case 'absent':
        return colors.error;
      case 'late':
        return colors.warning;
      default:
        return colors.gray[300];
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return 'check-circle';
      case 'absent':
        return 'close-circle';
      case 'late':
        return 'clock-alert';
      default:
        return 'circle-outline';
    }
  };

  const changeDate = (days) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const presentCount = Object.values(attendance).filter((s) => s === 'present').length;
  const absentCount = Object.values(attendance).filter((s) => s === 'absent').length;
  const lateCount = Object.values(attendance).filter((s) => s === 'late').length;

  const renderStudent = ({ item }) => {
    const status = attendance[item.id] || 'unmarked';
    const statusColor = getStatusColor(status);

    return (
      <TouchableOpacity
        style={[styles.studentCard, { borderLeftColor: statusColor }]}
        onPress={() => toggleAttendance(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.studentInfo}>
          <View style={[styles.avatar, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.avatarText, { color: statusColor }]}>
              {item.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.studentDetails}>
            <Text style={styles.studentName}>{item.name}</Text>
            <Text style={styles.studentRoll}>{item.rollNumber}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
          <MaterialCommunityIcons name={getStatusIcon(status)} size={24} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {status === 'unmarked' ? 'Tap' : status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading students...</Text>
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
        <Text style={styles.headerTitle}>Mark Attendance</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Date Selector */}
      <View style={styles.dateSelector}>
        <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(-1)}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.dateDisplay}>
          <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
          <Text style={styles.dateText}>
            {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
        <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(1)}>
          <MaterialCommunityIcons name="chevron-right" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: colors.success + '15' }]}
          onPress={() => markAll('present')}
        >
          <MaterialCommunityIcons name="check-all" size={18} color={colors.success} />
          <Text style={[styles.quickActionText, { color: colors.success }]}>All Present</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: colors.error + '15' }]}
          onPress={() => markAll('absent')}
        >
          <MaterialCommunityIcons name="close-circle-outline" size={18} color={colors.error} />
          <Text style={[styles.quickActionText, { color: colors.error }]}>All Absent</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: colors.success }]} />
          <Text style={styles.summaryText}>Present: {presentCount}</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: colors.error }]} />
          <Text style={styles.summaryText}>Absent: {absentCount}</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: colors.warning }]} />
          <Text style={styles.summaryText}>Late: {lateCount}</Text>
        </View>
      </View>

      {/* Students List */}
      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={renderStudent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-group-outline" size={60} color={colors.gray[300]} />
            <Text style={styles.emptyText}>No students found</Text>
          </View>
        }
      />

      {/* Save Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveAttendance}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <MaterialCommunityIcons name="content-save" size={22} color={colors.white} />
              <Text style={styles.saveButtonText}>Save Attendance</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  loadingText: {
    ...typography.body,
    color: colors.textLight,
    marginTop: spacing.md,
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
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    ...shadows.small,
  },
  dateArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 10,
    gap: spacing.xs,
  },
  quickActionText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  summaryText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 120,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    ...shadows.small,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.body,
    fontWeight: '600',
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  studentRoll: {
    ...typography.caption,
    color: colors.textLight,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    gap: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    ...typography.body,
    color: colors.textLight,
    marginTop: spacing.md,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.white,
    ...shadows.large,
  },
  saveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    ...typography.button,
    color: colors.white,
  },
});

export default MarkAttendanceScreen;

