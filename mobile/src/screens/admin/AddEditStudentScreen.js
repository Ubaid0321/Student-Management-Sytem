import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { studentAPI } from '../../services/api';
import { colors, spacing, typography, shadows } from '../../theme';

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Software Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Business Administration',
  'Commerce',
  'Economics',
  'Mathematics',
  'Physics',
  'Chemistry',
];

const AddEditStudentScreen = ({ route, navigation }) => {
  const student = route.params?.student;
  const isEditing = !!student;

  const [formData, setFormData] = useState({
    name: student?.name || '',
    email: student?.email || '',
    password: '',
    rollNumber: student?.rollNumber || '',
    department: student?.department || 'Computer Science',
    semester: student?.semester?.toString() || '1',
    phone: student?.phone || '',
    address: student?.address || '',
    dateOfBirth: student?.dateOfBirth || '',
    gender: student?.gender || 'Male',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!isEditing && !formData.password.trim()) {
      newErrors.password = 'Password is required for new students';
    } else if (!isEditing && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.rollNumber.trim()) {
      newErrors.rollNumber = 'Roll number is required';
    }

    const semester = parseInt(formData.semester);
    if (isNaN(semester) || semester < 1 || semester > 8) {
      newErrors.semester = 'Semester must be between 1 and 8';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const data = {
        ...formData,
        semester: parseInt(formData.semester),
      };

      if (isEditing) {
        delete data.password; // Don't update password on edit
        await studentAPI.update(student.id, data);
        Alert.alert('Success', 'Student updated successfully');
      } else {
        await studentAPI.create(data);
        Alert.alert('Success', 'Student added successfully');
      }
      navigation.goBack();
    } catch (error) {
      const message = error.response?.data?.error || 'Operation failed';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const GenderSelector = () => (
    <View style={styles.genderContainer}>
      <Text style={styles.label}>Gender</Text>
      <View style={styles.genderOptions}>
        {['Male', 'Female', 'Other'].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.genderOption,
              formData.gender === option && styles.genderOptionSelected,
            ]}
            onPress={() => updateField('gender', option)}
          >
            <MaterialCommunityIcons
              name={formData.gender === option ? 'radiobox-marked' : 'radiobox-blank'}
              size={20}
              color={formData.gender === option ? colors.primary : colors.gray[400]}
            />
            <Text
              style={[
                styles.genderText,
                formData.gender === option && styles.genderTextSelected,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Student' : 'Add Student'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <TextInput
            mode="outlined"
            label="Full Name *"
            value={formData.name}
            onChangeText={(text) => updateField('name', text)}
            error={!!errors.name}
            left={<TextInput.Icon icon="account" color={colors.gray[400]} />}
            style={styles.input}
            outlineColor={colors.gray[300]}
            activeOutlineColor={colors.primary}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <TextInput
            mode="outlined"
            label="Email Address *"
            value={formData.email}
            onChangeText={(text) => updateField('email', text)}
            keyboardType="email-address"
            autoCapitalize="none"
            error={!!errors.email}
            left={<TextInput.Icon icon="email" color={colors.gray[400]} />}
            style={styles.input}
            outlineColor={colors.gray[300]}
            activeOutlineColor={colors.primary}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          {!isEditing && (
            <>
              <TextInput
                mode="outlined"
                label="Password *"
                value={formData.password}
                onChangeText={(text) => updateField('password', text)}
                secureTextEntry
                error={!!errors.password}
                left={<TextInput.Icon icon="lock" color={colors.gray[400]} />}
                style={styles.input}
                outlineColor={colors.gray[300]}
                activeOutlineColor={colors.primary}
              />
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </>
          )}

          <TextInput
            mode="outlined"
            label="Phone Number"
            value={formData.phone}
            onChangeText={(text) => updateField('phone', text)}
            keyboardType="phone-pad"
            left={<TextInput.Icon icon="phone" color={colors.gray[400]} />}
            style={styles.input}
            outlineColor={colors.gray[300]}
            activeOutlineColor={colors.primary}
          />

          <GenderSelector />
        </View>

        {/* Academic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic Information</Text>

          <TextInput
            mode="outlined"
            label="Roll Number *"
            value={formData.rollNumber}
            onChangeText={(text) => updateField('rollNumber', text)}
            autoCapitalize="characters"
            error={!!errors.rollNumber}
            left={<TextInput.Icon icon="card-account-details" color={colors.gray[400]} />}
            style={styles.input}
            outlineColor={colors.gray[300]}
            activeOutlineColor={colors.primary}
          />
          {errors.rollNumber && <Text style={styles.errorText}>{errors.rollNumber}</Text>}

          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowDepartmentPicker(!showDepartmentPicker)}
          >
            <MaterialCommunityIcons name="office-building" size={22} color={colors.gray[400]} />
            <View style={styles.pickerContent}>
              <Text style={styles.pickerLabel}>Department</Text>
              <Text style={styles.pickerValue}>{formData.department}</Text>
            </View>
            <MaterialCommunityIcons
              name={showDepartmentPicker ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={colors.gray[400]}
            />
          </TouchableOpacity>

          {showDepartmentPicker && (
            <View style={styles.pickerOptions}>
              {DEPARTMENTS.map((dept) => (
                <TouchableOpacity
                  key={dept}
                  style={[
                    styles.pickerOption,
                    formData.department === dept && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    updateField('department', dept);
                    setShowDepartmentPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      formData.department === dept && styles.pickerOptionTextSelected,
                    ]}
                  >
                    {dept}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TextInput
            mode="outlined"
            label="Semester (1-8) *"
            value={formData.semester}
            onChangeText={(text) => updateField('semester', text)}
            keyboardType="numeric"
            error={!!errors.semester}
            left={<TextInput.Icon icon="school" color={colors.gray[400]} />}
            style={styles.input}
            outlineColor={colors.gray[300]}
            activeOutlineColor={colors.primary}
          />
          {errors.semester && <Text style={styles.errorText}>{errors.semester}</Text>}
        </View>

        {/* Additional Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>

          <TextInput
            mode="outlined"
            label="Date of Birth (YYYY-MM-DD)"
            value={formData.dateOfBirth}
            onChangeText={(text) => updateField('dateOfBirth', text)}
            left={<TextInput.Icon icon="calendar" color={colors.gray[400]} />}
            style={styles.input}
            outlineColor={colors.gray[300]}
            activeOutlineColor={colors.primary}
          />

          <TextInput
            mode="outlined"
            label="Address"
            value={formData.address}
            onChangeText={(text) => updateField('address', text)}
            multiline
            numberOfLines={3}
            left={<TextInput.Icon icon="map-marker" color={colors.gray[400]} />}
            style={[styles.input, styles.textArea]}
            outlineColor={colors.gray[300]}
            activeOutlineColor={colors.primary}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Saving...' : isEditing ? 'Update Student' : 'Add Student'}
          </Text>
          {!loading && (
            <MaterialCommunityIcons name="check" size={22} color={colors.white} />
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingBottom: spacing.xxl,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  textArea: {
    minHeight: 100,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginBottom: spacing.sm,
    marginTop: -spacing.xs,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  genderContainer: {
    marginTop: spacing.sm,
  },
  genderOptions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray[200],
    backgroundColor: colors.gray[50],
  },
  genderOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  genderText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  genderTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.sm,
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
  },
  pickerOptions: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray[200],
    marginBottom: spacing.md,
    maxHeight: 200,
  },
  pickerOption: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  pickerOptionSelected: {
    backgroundColor: colors.primary + '10',
  },
  pickerOptionText: {
    ...typography.body,
    color: colors.text,
  },
  pickerOptionTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
    ...shadows.medium,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.white,
  },
});

export default AddEditStudentScreen;

