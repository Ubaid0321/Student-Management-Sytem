import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { attendanceAPI } from '../../services/api';
import { colors, spacing, typography, shadows } from '../../theme';

const ViewAttendanceScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const fetchAttendance = useCallback(async () => {
    try {
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0);

      const response = await attendanceAPI.getByStudent(user.id, {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });

      setAttendance(response.data.records);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.id, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendance();
  };

  const changeMonth = (direction) => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear((prev) => prev - 1);
      } else {
        setSelectedMonth((prev) => prev - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear((prev) => prev + 1);
      } else {
        setSelectedMonth((prev) => prev + 1);
      }
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'present':
        return { color: colors.success, icon: 'check-circle', label: 'Present' };
      case 'absent':
        return { color: colors.error, icon: 'close-circle', label: 'Absent' };
      case 'late':
        return { color: colors.warning, icon: 'clock-alert', label: 'Late' };
      default:
        return { color: colors.gray[400], icon: 'help-circle', label: 'Unknown' };
    }
  };

  const renderAttendanceItem = ({ item }) => {
    const date = new Date(item.date);
    const config = getStatusConfig(item.status);

    return (
      <View style={[styles.attendanceCard, { borderLeftColor: config.color }]}>
        <View style={styles.dateContainer}>
          <Text style={styles.dateDay}>{date.getDate()}</Text>
          <Text style={styles.dateDayName}>
            {date.toLocaleDateString('en-US', { weekday: 'short' })}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <MaterialCommunityIcons name={config.icon} size={28} color={config.color} />
          <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>
    );
  };

  const getAttendanceColor = (percentage) => {
    if (percentage >= 75) return colors.success;
    if (percentage >= 50) return colors.warning;
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
        <Text style={styles.headerTitle}>Attendance Report</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Month Selector */}
      <View style={styles.monthSelector}>
        <TouchableOpacity style={styles.monthArrow} onPress={() => changeMonth('prev')}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {months[selectedMonth]} {selectedYear}
        </Text>
        <TouchableOpacity style={styles.monthArrow} onPress={() => changeMonth('next')}>
          <MaterialCommunityIcons name="chevron-right" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      {summary && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <View style={styles.percentageContainer}>
              <Text
                style={[
                  styles.percentageText,
                  { color: getAttendanceColor(summary.percentage) },
                ]}
              >
                {summary.percentage}%
              </Text>
              <Text style={styles.percentageLabel}>Attendance</Text>
            </View>
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: colors.success }]} />
                <Text style={styles.statValue}>{summary.presentDays}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: colors.error }]} />
                <Text style={styles.statValue}>{summary.absentDays}</Text>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: colors.warning }]} />
                <Text style={styles.statValue}>{summary.lateDays}</Text>
                <Text style={styles.statLabel}>Late</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Attendance List */}
      <FlatList
        data={attendance}
        keyExtractor={(item) => item.id}
        renderItem={renderAttendanceItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="calendar-blank" size={60} color={colors.gray[300]} />
            <Text style={styles.emptyText}>No attendance records for this month</Text>
          </View>
        }
      />
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
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadows.small,
  },
  monthArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthText: {
    ...typography.h3,
    color: colors.text,
  },
  summaryContainer: {
    padding: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    ...shadows.medium,
  },
  percentageContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  percentageText: {
    fontSize: 48,
    fontWeight: '700',
  },
  percentageLabel: {
    ...typography.body,
    color: colors.textLight,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.h2,
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textLight,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  attendanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    ...shadows.small,
  },
  dateContainer: {
    alignItems: 'center',
    minWidth: 50,
  },
  dateDay: {
    ...typography.h2,
    color: colors.text,
  },
  dateDayName: {
    ...typography.caption,
    color: colors.textLight,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    ...typography.body,
    fontWeight: '500',
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
});

export default ViewAttendanceScreen;

