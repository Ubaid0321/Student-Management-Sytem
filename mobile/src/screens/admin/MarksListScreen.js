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
import { marksAPI, studentAPI } from '../../services/api';
import { colors, spacing, typography, shadows } from '../../theme';

const MarksListScreen = ({ navigation }) => {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [studentsRes, subjectsRes] = await Promise.all([
        studentAPI.getAll(),
        marksAPI.getSubjects(),
      ]);

      // Fetch marks for each student
      const studentsWithMarks = await Promise.all(
        studentsRes.data.map(async (student) => {
          try {
            const marksRes = await marksAPI.getByStudent(student.id);
            return {
              ...student,
              summary: marksRes.data.summary,
            };
          } catch {
            return { ...student, summary: null };
          }
        })
      );

      setStudents(studentsWithMarks);
      setSubjects(subjectsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation, fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getGradeColor = (grade) => {
    if (!grade) return colors.gray[400];
    if (grade.startsWith('A')) return colors.success;
    if (grade.startsWith('B')) return colors.info;
    if (grade.startsWith('C')) return colors.warning;
    return colors.error;
  };

  const renderStudent = ({ item }) => {
    const grade = item.summary?.overallGrade || 'N/A';
    const percentage = item.summary?.overallPercentage || 0;
    const color = getGradeColor(grade);

    return (
      <View style={styles.studentCard}>
        <View style={styles.studentInfo}>
          <View style={[styles.avatar, { backgroundColor: color + '20' }]}>
            <Text style={[styles.avatarText, { color }]}>
              {item.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.studentDetails}>
            <Text style={styles.studentName}>{item.name}</Text>
            <Text style={styles.studentRoll}>{item.rollNumber}</Text>
            <Text style={styles.studentDept}>{item.department}</Text>
          </View>
        </View>
        <View style={styles.gradeContainer}>
          <View style={[styles.gradeBadge, { backgroundColor: color + '15' }]}>
            <Text style={[styles.gradeText, { color }]}>{grade}</Text>
          </View>
          <Text style={styles.percentageText}>{percentage}%</Text>
        </View>
      </View>
    );
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
        <Text style={styles.headerTitle}>Results Overview</Text>
        <Text style={styles.headerSubtitle}>
          {students.length} students • {subjects.length} subjects
        </Text>
      </View>

      {/* Quick Action */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddMarks')}
      >
        <MaterialCommunityIcons name="clipboard-plus" size={22} color={colors.white} />
        <Text style={styles.addButtonText}>Add New Marks</Text>
      </TouchableOpacity>

      {/* Subjects */}
      {subjects.length > 0 && (
        <View style={styles.subjectsContainer}>
          <Text style={styles.subjectsTitle}>Subjects:</Text>
          <View style={styles.subjectsList}>
            {subjects.map((subject) => (
              <View key={subject.id} style={styles.subjectChip}>
                <Text style={styles.subjectChipText}>{subject.code}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Students List */}
      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={renderStudent}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={60} color={colors.gray[300]} />
            <Text style={styles.emptyText}>No students found</Text>
            <Text style={styles.emptySubtext}>Add students to start recording marks</Text>
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
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.white,
  },
  headerSubtitle: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
    ...shadows.medium,
  },
  addButtonText: {
    ...typography.button,
    color: colors.white,
  },
  subjectsContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  subjectsTitle: {
    ...typography.bodySmall,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  subjectsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  subjectChip: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
  },
  subjectChipText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '500',
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.h3,
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
    color: colors.primary,
    fontWeight: '500',
  },
  studentDept: {
    ...typography.caption,
    color: colors.textLight,
  },
  gradeContainer: {
    alignItems: 'center',
  },
  gradeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    marginBottom: 4,
  },
  gradeText: {
    ...typography.h3,
    fontWeight: '700',
  },
  percentageText: {
    ...typography.caption,
    color: colors.textLight,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
});

export default MarksListScreen;

