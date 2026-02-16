import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, FlatList, Animated } from 'react-native';
import { useState, useRef, useCallback } from 'react';
import { usePregnancy } from '../../context/PregnancyContext';
import { useAuth } from '../../context/AuthContext';
import { addSymptomService } from '../../services/firebase/symptomService';
import { Timestamp } from 'firebase/firestore';
import { Symptom } from '../../types/pregnancy';

const SYMPTOM_TYPES = [
  'Nausea',
  'Fatigue',
  'Headache',
  'Back Pain',
  'Leg Cramps',
  'Heartburn',
  'Constipation',
  'Mood Swings',
  'Swelling',
  'Shortness of Breath',
  'Other',
];

const SEVERITY_LEVELS = [
  { value: 1, label: 'Mild', color: '#4CAF50' },
  { value: 2, label: 'Moderate', color: '#8BC34A' },
  { value: 3, label: 'Noticeable', color: '#FF9800' },
  { value: 4, label: 'Severe', color: '#FF5722' },
  { value: 5, label: 'Very Severe', color: '#F44336' },
];

export default function SymptomsScreen() {
  const { pregnancy, symptoms, loading, getCurrentWeek } = usePregnancy();
  const { user } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSymptomTypePicker, setShowSymptomTypePicker] = useState(false);
  const [showSeverityPicker, setShowSeverityPicker] = useState(false);
  const pickerSlideAnim = useRef(new Animated.Value(500)).current;
  const pickerFadeAnim = useRef(new Animated.Value(0)).current;

  // Form state
  const [symptomType, setSymptomType] = useState('');
  const [customSymptomType, setCustomSymptomType] = useState('');
  const [severity, setSeverity] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [notes, setNotes] = useState('');

  const openPicker = useCallback((pickerType: 'symptom' | 'severity') => {
    if (pickerType === 'symptom') {
      setShowSymptomTypePicker(true);
    } else {
      setShowSeverityPicker(true);
    }
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
    ]).start(() => {
      setShowSymptomTypePicker(false);
      setShowSeverityPicker(false);
    });
  }, [pickerSlideAnim, pickerFadeAnim]);

  const mapSymptomTypeToDb = (type: string): 'nausea' | 'fatigue' | 'headache' | 'back_pain' | 'other' => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('nausea')) return 'nausea';
    if (lowerType.includes('fatigue') || lowerType.includes('tired')) return 'fatigue';
    if (lowerType.includes('headache')) return 'headache';
    if (lowerType.includes('back') || lowerType.includes('pain')) return 'back_pain';
    return 'other';
  };

  const handleAddSymptom = async () => {
    const effectiveSymptomType = symptomType === 'Other' ? customSymptomType.trim() : symptomType.trim();
    if (!effectiveSymptomType) {
      Alert.alert('Error', symptomType === 'Other' ? 'Please enter a symptom type' : 'Please select symptom type');
      return;
    }
    if (!severity) {
      Alert.alert('Error', 'Please select severity level');
      return;
    }

    if (!user || !pregnancy) return;

    setSaving(true);
    try {
      const symptomData: Omit<Symptom, 'id' | 'createdAt' | 'pregnancyId'> = {
        type: mapSymptomTypeToDb(effectiveSymptomType),
        date: Timestamp.now(),
        week: getCurrentWeek(),
        severity,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      };

      await addSymptomService(user.uid, pregnancy.id, symptomData);

      // Reset form
      setSymptomType('');
      setCustomSymptomType('');
      setSeverity(null);
      setNotes('');
      setShowAddForm(false);
      Alert.alert('Success', 'Symptom added successfully');
    } catch (error) {
      console.error('Error adding symptom:', error);
      Alert.alert('Error', 'Failed to add symptom');
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

  const getSeverityColor = (severity: number) => {
    const level = SEVERITY_LEVELS.find(l => l.value === severity);
    return level?.color || '#999';
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Symptoms</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddForm(true)}
          >
            <Text style={styles.addButtonText}>+ Add Symptom</Text>
          </TouchableOpacity>
        </View>

        {/* Symptoms List */}
        {symptoms.length > 0 ? (
          <View style={styles.symptomsList}>
            {symptoms.map((symptom, index) => (
              <View key={symptom.id || `symptom-${index}-${symptom.date?.toMillis()}`} style={styles.symptomCard}>
                <View style={styles.symptomHeader}>
                  <Text style={styles.symptomType}>
                    {symptom.type.replace('_', ' ')}
                  </Text>
                  <View
                    style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(symptom.severity) },
                    ]}
                  >
                    <Text style={styles.severityText}>{symptom.severity}/5</Text>
                  </View>
                </View>
                <View style={styles.symptomInfo}>
                  <Text style={styles.symptomDate}>
                    {symptom.date.toDate().toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.symptomWeek}>Week {symptom.week}</Text>
                </View>
                {symptom.notes && (
                  <Text style={styles.symptomNotes}>{symptom.notes}</Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💊</Text>
            <Text style={styles.emptyText}>No symptoms logged</Text>
            <Text style={styles.emptySubtext}>
              Track how you're feeling throughout your pregnancy
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Symptom Modal */}
      <Modal
        visible={showAddForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddForm(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddForm(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Symptom</Text>
            <TouchableOpacity onPress={handleAddSymptom} disabled={saving}>
              <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Symptom Type *</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => openPicker('symptom')}
              >
                <Text style={[styles.dropdownText, !symptomType && styles.dropdownPlaceholder]}>
                  {symptomType || 'Select symptom type'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              {symptomType === 'Other' && (
                <TextInput
                  style={[styles.input, styles.customTypeInput]}
                  placeholder="Enter symptom type"
                  value={customSymptomType}
                  onChangeText={setCustomSymptomType}
                  placeholderTextColor="#999"
                  autoFocus
                />
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Severity *</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => openPicker('severity')}
              >
                <Text style={[styles.dropdownText, !severity && styles.dropdownPlaceholder]}>
                  {severity ? SEVERITY_LEVELS.find(l => l.value === severity)?.label : 'Select severity'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
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

          {/* Symptom Type Picker */}
          {showSymptomTypePicker && (
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
                  <Text style={styles.pickerTitle}>Select Symptom Type</Text>
                  <TouchableOpacity onPress={closePicker}>
                    <Text style={styles.pickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={SYMPTOM_TYPES}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.pickerOption}
                      onPress={() => {
                        setSymptomType(item);
                        closePicker();
                      }}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        symptomType === item && styles.pickerOptionSelected
                      ]}>
                        {item}
                      </Text>
                      {symptomType === item && (
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

          {/* Severity Picker */}
          {showSeverityPicker && (
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
                  <Text style={styles.pickerTitle}>Select Severity</Text>
                  <TouchableOpacity onPress={closePicker}>
                    <Text style={styles.pickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={SEVERITY_LEVELS}
                  keyExtractor={(item) => item.value.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.pickerOption}
                      onPress={() => {
                        setSeverity(item.value as 1 | 2 | 3 | 4 | 5);
                        closePicker();
                      }}
                    >
                      <View style={styles.severityOptionContent}>
                        <Text style={[
                          styles.pickerOptionText,
                          severity === item.value && styles.pickerOptionSelected
                        ]}>
                          {item.label}
                        </Text>
                        <View style={[styles.severityDot, { backgroundColor: item.color }]} />
                      </View>
                      {severity === item.value && (
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
  symptomsList: {
    gap: 16,
  },
  symptomCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  symptomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  symptomType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    textTransform: 'capitalize',
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  severityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  symptomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  symptomDate: {
    fontSize: 14,
    color: '#666',
  },
  symptomWeek: {
    fontSize: 12,
    fontWeight: '600',
    color: '#81bec1',
    backgroundColor: '#E0F2F3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  symptomNotes: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
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
  severityOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  severityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
