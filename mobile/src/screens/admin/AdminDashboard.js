import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { dashboardAPI } from '../../services/api';
import { colors, spacing, typography, shadows } from '../../theme';

const { width } = Dimensions.get('window');
const cardWidth = (width - spacing.lg * 2 - spacing.md) / 2;

const AdminDashboard = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const response = await dashboardAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const StatCard = ({ icon, title, value, subtitle, color, onPress }) => (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );

  const QuickAction = ({ icon, title, onPress, color }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '15' }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.gray[400]} />
    </TouchableOpacity>
  );

  const AttendanceTrend = () => {
    if (!stats?.attendanceTrend) return null;

    const maxValue = Math.max(...stats.attendanceTrend.map(d => d.total || 1));

    return (
      <View style={styles.trendContainer}>
        <Text style={styles.sectionTitle}>Attendance Trend (Last 7 Days)</Text>
        <View style={styles.trendChart}>
          {stats.attendanceTrend.map((day, index) => (
            <View key={index} style={styles.trendBar}>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${day.total > 0 ? (day.present / maxValue) * 100 : 0}%`,
                      backgroundColor: colors.success,
                    },
                  ]}
                />
              </View>
              <Text style={styles.trendLabel}>{day.day}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

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
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.name || 'Admin'}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <MaterialCommunityIcons name="logout" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>
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
        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <StatCard
            icon="account-group"
            title="Total Students"
            value={stats?.totalStudents || 0}
            color={colors.primary}
            onPress={() => navigation.navigate('Students')}
          />
          <StatCard
            icon="calendar-check"
            title="Today Present"
            value={stats?.todayAttendance?.present || 0}
            subtitle={`of ${stats?.totalStudents || 0}`}
            color={colors.success}
            onPress={() => navigation.navigate('Attendance')}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            icon="calendar-remove"
            title="Today Absent"
            value={stats?.todayAttendance?.absent || 0}
            color={colors.error}
            onPress={() => navigation.navigate('Attendance')}
          />
          <StatCard
            icon="percent"
            title="Avg. Attendance"
            value={`${stats?.overallAttendance?.percentage || 0}%`}
            subtitle="Last 30 days"
            color={colors.info}
          />
        </View>

        {/* Attendance Trend */}
        <AttendanceTrend />

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsContainer}>
            <QuickAction
              icon="account-plus"
              title="Add New Student"
              color={colors.primary}
              onPress={() => navigation.navigate('Students', { screen: 'AddStudent' })}
            />
            <QuickAction
              icon="clipboard-check"
              title="Mark Attendance"
              color={colors.success}
              onPress={() => navigation.navigate('Attendance', { screen: 'MarkAttendance' })}
            />
            <QuickAction
              icon="clipboard-text"
              title="Add Marks"
              color={colors.secondary}
              onPress={() => navigation.navigate('Marks', { screen: 'AddMarks' })}
            />
          </View>
        </View>

        {/* Recent Students */}
        {stats?.recentStudents?.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recently Added</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Students')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {stats.recentStudents.slice(0, 3).map((student) => (
              <View key={student.id} style={styles.recentItem}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {student.name?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={styles.recentInfo}>
                  <Text style={styles.recentName}>{student.name}</Text>
                  <Text style={styles.recentMeta}>
                    {student.rollNumber} • {student.department}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Low Attendance Alert */}
        {stats?.lowAttendanceStudents?.length > 0 && (
          <View style={styles.section}>
            <View style={styles.alertHeader}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={colors.warning} />
              <Text style={styles.alertTitle}>Low Attendance Alert</Text>
            </View>
            <View style={styles.alertBox}>
              {stats.lowAttendanceStudents.slice(0, 3).map((student) => (
                <View key={student.id} style={styles.alertItem}>
                  <Text style={styles.alertName}>{student.name}</Text>
                  <Text style={[styles.alertValue, { color: colors.error }]}>
                    {student.attendance}%
                  </Text>
                </View>
              ))}
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
    height: 180,
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
    bottom: 20,
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
    alignItems: 'center',
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
  scrollView: {
    flex: 1,
    marginTop: -40,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statCard: {
    width: cardWidth,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    borderLeftWidth: 4,
    ...shadows.medium,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.h2,
    color: colors.text,
  },
  statTitle: {
    ...typography.bodySmall,
    color: colors.textLight,
    marginTop: 4,
  },
  statSubtitle: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: 2,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  viewAllText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  quickActionsContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    ...shadows.small,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  quickActionText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  trendContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginTop: spacing.lg,
    ...shadows.small,
  },
  trendChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    marginTop: spacing.sm,
  },
  trendBar: {
    alignItems: 'center',
  },
  barContainer: {
    width: 30,
    height: 80,
    backgroundColor: colors.gray[100],
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 8,
  },
  trendLabel: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: 8,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  recentMeta: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  alertTitle: {
    ...typography.h3,
    color: colors.warning,
    marginLeft: spacing.sm,
  },
  alertBox: {
    backgroundColor: colors.warningLight + '30',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.warning + '20',
  },
  alertName: {
    ...typography.body,
    color: colors.text,
  },
  alertValue: {
    ...typography.body,
    fontWeight: '600',
  },
});

export default AdminDashboard;

