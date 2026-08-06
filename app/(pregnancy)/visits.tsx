import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, FlatList, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef, useCallback } from 'react';
import { usePregnancy } from '../../context/PregnancyContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { addHospitalVisitService } from '../../services/firebase/hospitalVisitService';
import { Timestamp } from 'firebase/firestore';
import { HospitalVisit } from '../../types/pregnancy';
import ScreenHeader from '../../components/ScreenHeader';

const VISIT_TYPES = [
  'Checkup',
  'Ultrasound',
  'Blood Test',
  'Glucose Test',
  'Anatomy Scan',
  'First Trimester Screening',
  'Non-Stress Test',
  'Emergency Visit',
  'Other',
];

export default function HospitalVisitsScreen() {
  const { pregnancy, hospitalVisits, loading, getCurrentWeek } = usePregnancy();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showVisitTypePicker, setShowVisitTypePicker] = useState(false);
  const pickerSlideAnim = useRef(new Animated.Value(500)).current;
  const pickerFadeAnim = useRef(new Animated.Value(0)).current;

  const openPicker = useCallback(() => {
    setShowVisitTypePicker(true);
    Animated.parallel([
      Animated.timing(pickerSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(pickerFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pickerSlideAnim, pickerFadeAnim]);

  const closePicker = useCallback(() => {
    Animated.parallel([
      Animated.timing(pickerSlideAnim, {
        toValue: 500,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(pickerFadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setShowVisitTypePicker(false));
  }, [pickerSlideAnim, pickerFadeAnim]);

  // Form state
  const [visitType, setVisitType] = useState('');
  const [customVisitType, setCustomVisitType] = useState('');
  const [notes, setNotes] = useState('');
  const [weight, setWeight] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');

  const mapVisitTypeToDb = (type: string): 'checkup' | 'ultrasound' | 'test' | 'emergency' => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('ultrasound') || lowerType.includes('scan')) return 'ultrasound';
    if (lowerType.includes('test') || lowerType.includes('blood') || lowerType.includes('glucose')) return 'test';
    if (lowerType.includes('emergency')) return 'emergency';
    return 'checkup';
  };

  const handleAddVisit = async () => {
    const effectiveVisitType = visitType === 'Other' ? customVisitType.trim() : visitType.trim();
    if (!effectiveVisitType) {
      Alert.alert('Error', visitType === 'Other' ? 'Please enter a visit type' : 'Please select visit type');
      return;
    }

    if (!user || !pregnancy) return;

    setSaving(true);
    try {
      const visitData: Omit<HospitalVisit, 'id' | 'createdAt' | 'pregnancyId'> = {
        type: mapVisitTypeToDb(effectiveVisitType),
        date: Timestamp.now(),
        week: getCurrentWeek(),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(weight.trim() ? { weight: parseFloat(weight) } : {}),
        ...(bloodPressure.trim() ? { bloodPressure: bloodPressure.trim() } : {}),
      };

      await addHospitalVisitService(user.uid, pregnancy.id, visitData);

      // Reset form
      setVisitType('');
      setCustomVisitType('');
      setNotes('');
      setWeight('');
      setBloodPressure('');
      setShowAddForm(false);
      Alert.alert('Success', 'Visit added successfully');
    } catch (error) {
      console.error('Error adding visit:', error);
      Alert.alert('Error', 'Failed to add visit');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!pregnancy) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No active pregnancy</Text>
      </View>
    );
  }

  const addButton = (
    <TouchableOpacity
      style={styles.addButton}
      onPress={() => setShowAddForm(true)}
    >
      <Ionicons name="add" size={18} color="#fff" />
      <Text style={styles.addButtonText}>Add Visit</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Hospital Visits" rightElement={addButton} />
      <ScrollView contentContainerStyle={styles.contentContainer}>
      {/* Visits List */}
      {hospitalVisits.length > 0 ? (
        <View style={styles.visitsList}>
          {hospitalVisits.map((visit) => (
            <View key={visit.id} style={styles.visitCard}>
              <View style={styles.visitHeader}>
                <Text style={styles.visitType}>{visit.type}</Text>
                <Text style={styles.visitWeek}>Week {visit.week}</Text>
              </View>
              <Text style={styles.visitDate}>
                {visit.date.toDate().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              {visit.notes && (
                <Text style={styles.visitNotes}>{visit.notes}</Text>
              )}
              {visit.weight && (
                <Text style={styles.visitDetail}>Weight: {visit.weight} kg</Text>
              )}
              {visit.bloodPressure && (
                <Text style={styles.visitDetail}>BP: {visit.bloodPressure}</Text>
              )}
              {visit.nextVisitDate && (
                <View style={styles.nextVisit}>
                  <Text style={styles.nextVisitLabel}>Next Visit:</Text>
                  <Text style={styles.nextVisitDate}>
                    {visit.nextVisitDate.toDate().toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="medkit-outline" size={48} color={colors.textMuted} style={styles.emptyIcon} />
          <Text style={styles.emptyText}>No hospital visits yet</Text>
          <Text style={styles.emptySubtext}>
            Track your checkups, ultrasounds, and appointments
          </Text>
        </View>
      )}
      </ScrollView>

      {/* Add Visit Modal */}
      <Modal
        visible={showAddForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          console.log('Modal closing');
          setShowAddForm(false);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddForm(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Visit</Text>
            <TouchableOpacity onPress={handleAddVisit} disabled={saving}>
              <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Visit Type *</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={openPicker}
              >
                <Text style={[styles.dropdownText, !visitType && styles.dropdownPlaceholder]}>
                  {visitType || 'Select visit type'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              {visitType === 'Other' && (
                <TextInput
                  style={[styles.input, styles.customTypeInput]}
                  placeholder="Enter visit type"
                  value={customVisitType}
                  onChangeText={setCustomVisitType}
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your weight"
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Blood Pressure</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 120/80"
                value={bloodPressure}
                onChangeText={setBloodPressure}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add any notes or observations"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </ScrollView>

          {/* Visit Type Picker - rendered inside the Add Visit modal */}
          {showVisitTypePicker && (
            <View style={styles.pickerOverlay}>
              <Animated.View style={[styles.pickerBackdrop, { opacity: pickerFadeAnim }]}>
                <TouchableOpacity
                  style={StyleSheet.absoluteFill}
                  activeOpacity={1}
                  onPress={closePicker}
                />
              </Animated.View>
              <Animated.View style={[styles.pickerContainer, { transform: [{ translateY: pickerSlideAnim }] }]}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Select Visit Type</Text>
                  <TouchableOpacity onPress={closePicker}>
                    <Text style={styles.pickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={VISIT_TYPES}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.pickerOption}
                      onPress={() => {
                        setVisitType(item);
                        closePicker();
                      }}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        visitType === item && styles.pickerOptionSelected
                      ]}>
                        {item}
                      </Text>
                      {visitType === item && (
                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  )}
                  style={styles.pickerList}
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
              </Animated.View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.background,
  },
  contentContainer: {
    padding: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.primaryDark,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  visitsList: {
    gap: 16,
  },
  visitCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  visitType: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
    textTransform: 'capitalize',
  },
  visitWeek: {
    fontSize: 12,
    fontWeight: '600',
    color: c.primaryDark,
    backgroundColor: c.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  visitDate: {
    fontSize: 14,
    color: c.textSecondary,
    marginBottom: 8,
  },
  visitNotes: {
    fontSize: 14,
    color: c.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  visitDetail: {
    fontSize: 14,
    color: c.textSecondary,
    marginBottom: 4,
  },
  nextVisit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  nextVisitLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textMuted,
    marginRight: 8,
  },
  nextVisitDate: {
    fontSize: 12,
    color: c.primary,
  },
  emptyState: {
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 48,
    alignItems: 'center',
    marginTop: 60,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: c.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingTop: 60,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
  },
  cancelButton: {
    fontSize: 16,
    color: c.textSecondary,
  },
  saveButton: {
    fontSize: 16,
    color: c.primaryDark,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: c.textPrimary,
    borderWidth: 1,
    borderColor: c.border,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  dropdown: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: c.textPrimary,
  },
  dropdownPlaceholder: {
    color: c.textMuted,
  },
  dropdownArrow: {
    fontSize: 12,
    color: c.textSecondary,
  },
  customTypeInput: {
    marginTop: 10,
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 10,
  },
  pickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerContainer: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    height: 500,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
  },
  pickerDone: {
    fontSize: 16,
    color: c.primaryDark,
    fontWeight: '600',
  },
  pickerList: {
    flexGrow: 0,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  pickerOptionText: {
    fontSize: 16,
    color: c.textPrimary,
  },
  pickerOptionSelected: {
    color: c.primary,
    fontWeight: '600',
  },
  pickerCheckmark: {
    fontSize: 18,
    color: c.primary,
    fontWeight: 'bold',
  },
});
