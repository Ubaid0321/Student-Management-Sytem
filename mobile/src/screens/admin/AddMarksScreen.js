import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { studentAPI, marksAPI } from '../../services/api';
import { colors, spacing, typography, shadows } from '../../theme';

const EXAM_TYPES = ['Midterm', 'Final', 'Quiz 1', 'Quiz 2', 'Assignment', 'Lab'];

const AddMarksScreen = ({ navigation }) => {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedExamType, setSelectedExamType] = useState('Midterm');
  const [totalMarks, setTotalMarks] = useState('100');
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [showExamPicker, setShowExamPicker] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [studentsRes, subjectsRes] = await Promise.all([
        studentAPI.getAll(),
        marksAPI.getSubjects(),
      ]);

      setStudents(studentsRes.data);
      setSubjects(subjectsRes.data);
      if (subjectsRes.data.length > 0) {
        setSelectedSubject(subjectsRes.data[0]);
      }

      // Initialize marks
      const marksMap = {};
      studentsRes.data.forEach((student) => {
        marksMap[student.id] = '';
      });
      setMarks(marksMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateMarks = (studentId, value) => {
    // Allow only numeric values
    const numericValue = value.replace(/[^0-9.]/g, '');
    setMarks((prev) => ({ ...prev, [studentId]: numericValue }));
  };

  const saveMarks = async () => {
    if (!selectedSubject) {
      Alert.alert('Error', 'Please select a subject');
      return;
    }

    const total = parseFloat(totalMarks);
    if (isNaN(total) || total <= 0) {
      Alert.alert('Error', 'Please enter valid total marks');
      return;
    }

    const marksData = Object.entries(marks)
      .filter(([_, value]) => value !== '' && !isNaN(parseFloat(value)))
      .map(([studentId, obtained]) => ({
        studentId,
        obtainedMarks: parseFloat(obtained),
      }));

    if (marksData.length === 0) {
      Alert.alert('No Marks Entered', 'Please enter marks for at least one student');
      return;
    }

    // Validate marks don't exceed total
    const invalidMarks = marksData.find((m) => m.obtainedMarks > total || m.obtainedMarks < 0);
    if (invalidMarks) {
      Alert.alert('Invalid Marks', 'Marks cannot be negative or exceed total marks');
      return;
    }

    setSaving(true);
    try {
      await marksAPI.addBulk({
        subjectId: selectedSubject.id,
        examType: selectedExamType,
        totalMarks: total,
        date: new Date().toISOString().split('T')[0],
        marksData,
      });
      Alert.alert('Success', `Marks saved for ${marksData.length} students`);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  const renderStudent = ({ item }) => (
    <View style={styles.studentCard}>
      <View style={styles.studentInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.studentDetails}>
          <Text style={styles.studentName}>{item.name}</Text>
          <Text style={styles.studentRoll}>{item.rollNumber}</Text>
        </View>
      </View>
      <View style={styles.marksInputContainer}>
        <TextInput
          mode="outlined"
          value={marks[item.id] || ''}
          onChangeText={(value) => updateMarks(item.id, value)}
          keyboardType="decimal-pad"
          style={styles.marksInput}
          outlineColor={colors.gray[300]}
          activeOutlineColor={colors.primary}
          dense
          placeholder="0"
        />
        <Text style={styles.totalMarksText}>/ {totalMarks}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
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
        <Text style={styles.headerTitle}>Add Marks</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Configuration Section */}
      <View style={styles.configSection}>
        {/* Subject Picker */}
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowSubjectPicker(true)}
        >
          <MaterialCommunityIcons name="book" size={20} color={colors.primary} />
          <View style={styles.pickerContent}>
            <Text style={styles.pickerLabel}>Subject</Text>
            <Text style={styles.pickerValue}>
              {selectedSubject?.name || 'Select Subject'}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={24} color={colors.gray[400]} />
        </TouchableOpacity>

        {/* Exam Type & Total Marks Row */}
        <View style={styles.configRow}>
          <TouchableOpacity
            style={[styles.pickerButton, { flex: 1 }]}
            onPress={() => setShowExamPicker(true)}
          >
            <MaterialCommunityIcons name="clipboard-text" size={20} color={colors.primary} />
            <View style={styles.pickerContent}>
              <Text style={styles.pickerLabel}>Exam</Text>
              <Text style={styles.pickerValue}>{selectedExamType}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-down" size={20} color={colors.gray[400]} />
          </TouchableOpacity>

          <View style={styles.totalMarksContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            <TextInput
              mode="outlined"
              value={totalMarks}
              onChangeText={setTotalMarks}
              keyboardType="numeric"
              style={styles.totalInput}
              outlineColor={colors.gray[300]}
              activeOutlineColor={colors.primary}
              dense
            />
          </View>
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
          onPress={saveMarks}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <MaterialCommunityIcons name="content-save" size={22} color={colors.white} />
              <Text style={styles.saveButtonText}>Save Marks</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Subject Picker Modal */}
      <Modal
        visible={showSubjectPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSubjectPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSubjectPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Subject</Text>
            {subjects.map((subject) => (
              <TouchableOpacity
                key={subject.id}
                style={[
                  styles.modalOption,
                  selectedSubject?.id === subject.id && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setSelectedSubject(subject);
                  setShowSubjectPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    selectedSubject?.id === subject.id && styles.modalOptionTextSelected,
                  ]}
                >
                  {subject.name} ({subject.code})
                </Text>
                {selectedSubject?.id === subject.id && (
                  <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Exam Type Picker Modal */}
      <Modal
        visible={showExamPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExamPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowExamPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Exam Type</Text>
            {EXAM_TYPES.map((exam) => (
              <TouchableOpacity
                key={exam}
                style={[
                  styles.modalOption,
                  selectedExamType === exam && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setSelectedExamType(exam);
                  setShowExamPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    selectedExamType === exam && styles.modalOptionTextSelected,
                  ]}
                >
                  {exam}
                </Text>
                {selectedExamType === exam && (
                  <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
  configSection: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    ...shadows.small,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  pickerContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  pickerLabel: {
    ...typography.caption,
    color: colors.textLight,
  },
  pickerValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  totalMarksContainer: {
    alignItems: 'center',
  },
  totalLabel: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: 4,
  },
  totalInput: {
    width: 80,
    backgroundColor: colors.white,
    textAlign: 'center',
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
    ...shadows.small,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  marksInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marksInput: {
    width: 70,
    backgroundColor: colors.white,
    textAlign: 'center',
  },
  totalMarksText: {
    ...typography.body,
    color: colors.textLight,
    marginLeft: spacing.xs,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.xs,
  },
  modalOptionSelected: {
    backgroundColor: colors.primary + '10',
  },
  modalOptionText: {
    ...typography.body,
    color: colors.text,
  },
  modalOptionTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
});

export default AddMarksScreen;

