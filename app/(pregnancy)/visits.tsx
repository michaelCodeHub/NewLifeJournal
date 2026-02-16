import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, FlatList, Animated } from 'react-native';
import { useState, useRef, useCallback } from 'react';
import { usePregnancy } from '../../context/PregnancyContext';
import { useAuth } from '../../context/AuthContext';
import { addHospitalVisitService } from '../../services/firebase/hospitalVisitService';
import { Timestamp } from 'firebase/firestore';
import { HospitalVisit } from '../../types/pregnancy';

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
        <ActivityIndicator size="large" color="#81bec1" />
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

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Hospital Visits</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              console.log('Add Visit button pressed');
              setShowAddForm(true);
            }}
          >
            <Text style={styles.addButtonText}>+ Add Visit</Text>
          </TouchableOpacity>
        </View>

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
          <Text style={styles.emptyIcon}>🏥</Text>
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
                  placeholderTextColor="#999"
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
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Blood Pressure</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 120/80"
                value={bloodPressure}
                onChangeText={setBloodPressure}
                placeholderTextColor="#999"
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
                placeholderTextColor="#999"
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
                        <Text style={styles.pickerCheckmark}>✓</Text>
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F2F3',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0F2F3',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  addButton: {
    backgroundColor: '#81bec1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
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
    color: '#1a1a1a',
    textTransform: 'capitalize',
  },
  visitWeek: {
    fontSize: 12,
    fontWeight: '600',
    color: '#81bec1',
    backgroundColor: '#E0F2F3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  visitDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  visitNotes: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  visitDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  nextVisit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  nextVisitLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginRight: 8,
  },
  nextVisitDate: {
    fontSize: 12,
    color: '#81bec1',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 48,
    alignItems: 'center',
    marginTop: 60,
    shadowColor: '#000',
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
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingTop: 60,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    fontSize: 16,
    color: '#81bec1',
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
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  dropdown: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  dropdownPlaceholder: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
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
    backgroundColor: '#fff',
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
    borderBottomColor: '#f0f0f0',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  pickerDone: {
    fontSize: 16,
    color: '#81bec1',
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
    borderBottomColor: '#f5f5f5',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  pickerOptionSelected: {
    color: '#81bec1',
    fontWeight: '600',
  },
  pickerCheckmark: {
    fontSize: 18,
    color: '#81bec1',
    fontWeight: 'bold',
  },
});
