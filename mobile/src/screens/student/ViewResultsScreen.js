import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { marksAPI } from '../../services/api';
import { colors, spacing, typography, shadows } from '../../theme';

const ViewResultsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState(null);

  const fetchResults = useCallback(async () => {
    try {
      const response = await marksAPI.getByStudent(user.id);
      setResults(response.data);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchResults();
  };

  const getGradeColor = (grade) => {
    if (!grade) return colors.gray[400];
    if (grade.startsWith('A')) return colors.success;
    if (grade.startsWith('B')) return colors.info;
    if (grade.startsWith('C')) return colors.warning;
    if (grade === 'D') return colors.warning;
    return colors.error;
  };

  const toggleSubject = (subjectId) => {
    setExpandedSubject(expandedSubject === subjectId ? null : subjectId);
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
        <Text style={styles.headerTitle}>Result Card</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Student Info */}
        {results?.student && (
          <View style={styles.studentCard}>
            <View style={styles.studentAvatar}>
              <Text style={styles.avatarText}>
                {results.student.name?.charAt(0)?.toUpperCase()}
              </Text>
            </View>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{results.student.name}</Text>
              <Text style={styles.studentMeta}>{results.student.rollNumber}</Text>
              <Text style={styles.studentMeta}>
                {results.student.department} • Semester {results.student.semester}
              </Text>
            </View>
          </View>
        )}

        {/* Overall Summary */}
        {results?.summary && (
          <View style={styles.summaryCard}>
            <View style={styles.gradeCircle}>
              <Text
                style={[
                  styles.gradeText,
                  { color: getGradeColor(results.summary.overallGrade) },
                ]}
              >
                {results.summary.overallGrade}
              </Text>
              <Text style={styles.gradeLabel}>Grade</Text>
            </View>
            <View style={styles.summaryDetails}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Obtained</Text>
                <Text style={styles.summaryValue}>{results.summary.totalObtained}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Maximum</Text>
                <Text style={styles.summaryValue}>{results.summary.totalMaximum}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Percentage</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    { color: getGradeColor(results.summary.overallGrade) },
                  ]}
                >
                  {results.summary.overallPercentage}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Subject-wise Results */}
        <Text style={styles.sectionTitle}>Subject-wise Results</Text>

        {results?.subjects?.length > 0 ? (
          results.subjects.map((subject) => (
            <View key={subject.subjectId} style={styles.subjectCard}>
              <TouchableOpacity
                style={styles.subjectHeader}
                onPress={() => toggleSubject(subject.subjectId)}
                activeOpacity={0.7}
              >
                <View style={styles.subjectInfo}>
                  <Text style={styles.subjectName}>{subject.subjectName}</Text>
                  <Text style={styles.subjectCode}>{subject.subjectCode}</Text>
                </View>
                <View style={styles.subjectMeta}>
                  <Text style={styles.examCount}>{subject.exams.length} exams</Text>
                  <MaterialCommunityIcons
                    name={expandedSubject === subject.subjectId ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color={colors.gray[400]}
                  />
                </View>
              </TouchableOpacity>

              {expandedSubject === subject.subjectId && (
                <View style={styles.examsContainer}>
                  {subject.exams.map((exam) => (
                    <View key={exam.id} style={styles.examRow}>
                      <View style={styles.examInfo}>
                        <Text style={styles.examType}>{exam.examType}</Text>
                        <Text style={styles.examDate}>{exam.date}</Text>
                      </View>
                      <View style={styles.examMarks}>
                        <Text style={styles.marksText}>
                          {exam.obtainedMarks}/{exam.totalMarks}
                        </Text>
                        <View
                          style={[
                            styles.gradeBadge,
                            { backgroundColor: getGradeColor(exam.grade) + '20' },
                          ]}
                        >
                          <Text style={[styles.gradeSmall, { color: getGradeColor(exam.grade) }]}>
                            {exam.grade}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={60} color={colors.gray[300]} />
            <Text style={styles.emptyText}>No results available yet</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  studentAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  avatarText: {
    ...typography.h2,
    color: colors.white,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    ...typography.h3,
    color: colors.text,
  },
  studentMeta: {
    ...typography.bodySmall,
    color: colors.textLight,
    marginTop: 2,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  gradeCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  gradeText: {
    fontSize: 36,
    fontWeight: '700',
  },
  gradeLabel: {
    ...typography.caption,
    color: colors.textLight,
  },
  summaryDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    ...typography.bodySmall,
    color: colors.textLight,
  },
  summaryValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  subjectCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...shadows.small,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  subjectCode: {
    ...typography.caption,
    color: colors.textLight,
  },
  subjectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  examCount: {
    ...typography.caption,
    color: colors.textLight,
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  examsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    padding: spacing.md,
  },
  examRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[50],
  },
  examInfo: {},
  examType: {
    ...typography.body,
    color: colors.text,
  },
  examDate: {
    ...typography.caption,
    color: colors.textLight,
  },
  examMarks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  marksText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  gradeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gradeSmall: {
    ...typography.bodySmall,
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
});

export default ViewResultsScreen;

