import { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Animated } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { initializeWeekData } from '../../services/firebase/weekInfoService';
import { uploadWeekImage } from '../../services/firebase/storageService';
import { useAuth } from '../../context/AuthContext';
import { usePregnancy } from '../../context/PregnancyContext';
import { addHospitalVisit, addSymptom } from '../../services/firebase/pregnancyService';
import { signUpWithEmail } from '../../services/emailAuth';
import { Timestamp } from 'firebase/firestore';

const TEST_EMAIL = 'test@newlifejournal.app';
const TEST_PASSWORD = 'TestUser123!';

export default function AdminScreen() {
  const { user } = useAuth();
  const { pregnancy } = usePregnancy();
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [dummyDataLoading, setDummyDataLoading] = useState(false);
  const [dummyDataAdded, setDummyDataAdded] = useState(false);
  const [testAccountLoading, setTestAccountLoading] = useState(false);
  const [testAccountCreated, setTestAccountCreated] = useState(false);

  // Week image upload state
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const weekPickerAnim = useRef(new Animated.Value(500)).current;
  const weekPickerFade = useRef(new Animated.Value(0)).current;

  const openWeekPicker = () => {
    setShowWeekPicker(true);
    Animated.parallel([
      Animated.timing(weekPickerAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(weekPickerFade, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const closeWeekPicker = () => {
    Animated.parallel([
      Animated.timing(weekPickerAnim, { toValue: 500, duration: 250, useNativeDriver: true }),
      Animated.timing(weekPickerFade, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setShowWeekPicker(false));
  };

  const handleUploadWeekImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant photo library access to upload week images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    try {
      setImageUploading(true);
      const uri = result.assets[0].uri;
      await uploadWeekImage(selectedWeek, uri);
      Alert.alert('Success!', `Week ${selectedWeek} image uploaded successfully. It will appear in the Week Detail view.`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  const handleInitialize = async () => {
    Alert.alert(
      'Initialize Week Data',
      'This will populate Firestore with pregnancy week information for all 40 weeks (1-40). Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Initialize',
          onPress: async () => {
            try {
              setLoading(true);
              await initializeWeekData();
              setInitialized(true);
              Alert.alert('Success!', 'Pregnancy week data has been initialized in Firestore.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to initialize data');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Helper to create a date in the past
  const daysAgo = (days: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  };

  // Helper to calculate week from days ago
  const getWeekFromDaysAgo = (days: number): number => {
    // Assuming pregnancy started ~280 days ago (40 weeks)
    const totalDays = 280;
    const currentDay = totalDays - days;
    return Math.max(1, Math.min(40, Math.floor(currentDay / 7)));
  };

  const handleAddDummyData = async () => {
    if (!user || !pregnancy) {
      Alert.alert('Error', 'Please make sure you have an active pregnancy before adding dummy data.');
      return;
    }

    Alert.alert(
      'Add Dummy Data',
      'This will add realistic hospital visits and symptoms throughout your pregnancy timeline. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Add Data',
          onPress: async () => {
            try {
              setDummyDataLoading(true);

              const hospitalVisits = [
                // First Trimester
                { type: 'checkup' as const, daysAgo: 250, notes: 'First prenatal visit. Confirmed pregnancy. Discussed prenatal vitamins and diet.' },
                { type: 'test' as const, daysAgo: 240, notes: 'Blood work and initial screening tests completed.' },
                { type: 'ultrasound' as const, daysAgo: 230, notes: 'First ultrasound! Saw the heartbeat. Everything looks great!' },
                { type: 'checkup' as const, daysAgo: 220, notes: 'Regular checkup. Baby is growing well. Morning sickness discussed.' },
                // Second Trimester
                { type: 'test' as const, daysAgo: 200, notes: 'Glucose screening test completed.' },
                { type: 'ultrasound' as const, daysAgo: 180, notes: 'Anatomy scan! Baby is healthy. Found out the gender.' },
                { type: 'checkup' as const, daysAgo: 160, notes: 'Regular checkup. Feeling baby movements now. Weight and BP normal.' },
                { type: 'checkup' as const, daysAgo: 140, notes: 'Everything progressing normally. Discussed birth plan options.' },
                // Third Trimester
                { type: 'checkup' as const, daysAgo: 120, notes: 'Third trimester begins! Baby is head down. Discussed labor signs.' },
                { type: 'test' as const, daysAgo: 100, notes: 'Group B Strep test completed. Results pending.' },
                { type: 'checkup' as const, daysAgo: 80, notes: 'Weekly visits start now. Baby is doing great.' },
                { type: 'checkup' as const, daysAgo: 60, notes: 'Cervix check. Not dilated yet. Baby in good position.' },
                { type: 'ultrasound' as const, daysAgo: 40, notes: 'Growth scan. Baby estimated at 6.5 lbs. Good fluid levels.' },
                { type: 'checkup' as const, daysAgo: 20, notes: '1cm dilated. Baby could come any day now!' },
                { type: 'checkup' as const, daysAgo: 7, notes: 'Latest checkup. 2cm dilated. Discussed induction if needed.' },
              ];

              const symptoms = [
                // First Trimester Symptoms
                { type: 'nausea' as const, severity: 4, daysAgo: 245, notes: 'Morning sickness started. Very nauseated in the mornings.' },
                { type: 'fatigue' as const, severity: 5, daysAgo: 243, notes: 'Extremely tired. Need naps during the day.' },
                { type: 'nausea' as const, severity: 5, daysAgo: 240, notes: 'Morning sickness worse. Can barely eat.' },
                { type: 'headache' as const, severity: 3, daysAgo: 235, notes: 'Mild headache. Drinking more water.' },
                { type: 'fatigue' as const, severity: 4, daysAgo: 230, notes: 'Still very tired but managing.' },
                { type: 'nausea' as const, severity: 3, daysAgo: 225, notes: 'Nausea improving slightly. Found crackers help.' },
                { type: 'nausea' as const, severity: 2, daysAgo: 215, notes: 'Much better! Morning sickness easing up.' },
                // Second Trimester Symptoms
                { type: 'fatigue' as const, severity: 2, daysAgo: 200, notes: 'Energy returning! Feeling much better.' },
                { type: 'back_pain' as const, severity: 2, daysAgo: 190, notes: 'Slight back pain starting. Using support pillow.' },
                { type: 'headache' as const, severity: 2, daysAgo: 180, notes: 'Occasional headaches. Managing with rest.' },
                { type: 'other' as const, severity: 1, daysAgo: 170, notes: 'Leg cramps at night. Taking magnesium.' },
                { type: 'back_pain' as const, severity: 3, daysAgo: 160, notes: 'Back pain increasing. Started prenatal yoga.' },
                { type: 'other' as const, severity: 2, daysAgo: 150, notes: 'Heartburn after meals. Eating smaller portions.' },
                { type: 'fatigue' as const, severity: 2, daysAgo: 140, notes: 'Getting tired more easily as belly grows.' },
                // Third Trimester Symptoms
                { type: 'back_pain' as const, severity: 4, daysAgo: 120, notes: 'Lower back pain worse. Using heating pad.' },
                { type: 'other' as const, severity: 3, daysAgo: 110, notes: 'Swelling in feet and ankles. Elevating feet helps.' },
                { type: 'fatigue' as const, severity: 3, daysAgo: 100, notes: 'Hard to get comfortable at night. Using many pillows.' },
                { type: 'other' as const, severity: 3, daysAgo: 90, notes: 'Shortness of breath when climbing stairs.' },
                { type: 'back_pain' as const, severity: 4, daysAgo: 80, notes: 'Pelvic pressure increasing. Baby dropping.' },
                { type: 'other' as const, severity: 4, daysAgo: 70, notes: 'Braxton Hicks contractions. Practice contractions.' },
                { type: 'fatigue' as const, severity: 4, daysAgo: 60, notes: 'Very uncomfortable. Can\'t sleep well.' },
                { type: 'other' as const, severity: 2, daysAgo: 50, notes: 'Nesting instinct strong! Cleaning everything.' },
                { type: 'back_pain' as const, severity: 5, daysAgo: 40, notes: 'Lower back very sore. Baby is big now.' },
                { type: 'other' as const, severity: 3, daysAgo: 30, notes: 'Frequent urination. Baby on bladder.' },
                { type: 'fatigue' as const, severity: 5, daysAgo: 20, notes: 'Exhausted. Ready for baby to arrive.' },
                { type: 'other' as const, severity: 3, daysAgo: 10, notes: 'Lost mucus plug. Labor signs appearing.' },
                { type: 'back_pain' as const, severity: 4, daysAgo: 5, notes: 'Constant back ache. Baby engaged in pelvis.' },
              ];

              // Add hospital visits
              for (const visit of hospitalVisits) {
                const visitDate = daysAgo(visit.daysAgo);
                const week = getWeekFromDaysAgo(visit.daysAgo);

                await addHospitalVisit(user.uid, pregnancy.id, {
                  type: visit.type,
                  date: Timestamp.fromDate(visitDate),
                  week,
                  notes: visit.notes,
                });
              }

              // Add symptoms
              for (const symptom of symptoms) {
                const symptomDate = daysAgo(symptom.daysAgo);
                const week = getWeekFromDaysAgo(symptom.daysAgo);

                await addSymptom(user.uid, pregnancy.id, {
                  type: symptom.type,
                  severity: symptom.severity as 1 | 2 | 3 | 4 | 5,
                  date: Timestamp.fromDate(symptomDate),
                  week,
                  notes: symptom.notes,
                });
              }

              setDummyDataAdded(true);
              Alert.alert('Success!', `Added ${hospitalVisits.length} hospital visits and ${symptoms.length} symptoms to your pregnancy timeline.`);
            } catch (error: any) {
              console.error('Error adding dummy data:', error);
              Alert.alert('Error', error.message || 'Failed to add dummy data');
            } finally {
              setDummyDataLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCreateTestAccount = async () => {
    setTestAccountLoading(true);
    const result = await signUpWithEmail(TEST_EMAIL, TEST_PASSWORD);
    setTestAccountLoading(false);
    if (result.success) {
      setTestAccountCreated(true);
      Alert.alert(
        'Test Account Created ✓',
        `Email: ${TEST_EMAIL}\nPassword: ${TEST_PASSWORD}\n\nA verification email was sent — check the inbox (or skip verification in Firebase Console).`
      );
    } else if (result.error?.includes('email-already-in-use')) {
      Alert.alert(
        'Account Exists',
        `A test account already exists.\n\nEmail: ${TEST_EMAIL}\nPassword: ${TEST_PASSWORD}`
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to create test account');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Setup</Text>
        <Text style={styles.subtitle}>Initialize pregnancy week information</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📚 Pregnancy Week Data</Text>
        <Text style={styles.cardDescription}>
          Initialize the Firestore database with pregnancy week information including baby development, mother changes, and tips for each week.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>What will be created:</Text>
          <Text style={styles.infoItem}>• 40 week documents (weeks 1-40)</Text>
          <Text style={styles.infoItem}>• Baby size, length, and weight data</Text>
          <Text style={styles.infoItem}>• Baby development milestones</Text>
          <Text style={styles.infoItem}>• Mother changes and symptoms</Text>
          <Text style={styles.infoItem}>• Weekly tips and recommendations</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, (loading || initialized) && styles.buttonDisabled]}
          onPress={handleInitialize}
          disabled={loading || initialized}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {initialized ? '✓ Data Initialized' : 'Initialize Week Data'}
            </Text>
          )}
        </TouchableOpacity>

        {initialized && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              ✓ Data successfully initialized! You can now see week-specific information on the home screen.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏥 Add Dummy Data</Text>
        <Text style={styles.cardDescription}>
          Add realistic hospital visits and symptoms throughout your pregnancy timeline for testing purposes.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>What will be added:</Text>
          <Text style={styles.infoItem}>• 15 hospital visits (checkups, ultrasounds, tests)</Text>
          <Text style={styles.infoItem}>• 27 symptoms with severity levels</Text>
          <Text style={styles.infoItem}>• Spread across all three trimesters</Text>
          <Text style={styles.infoItem}>• Realistic dates based on your pregnancy</Text>
          <Text style={styles.infoItem}>• Detailed notes for each entry</Text>
        </View>

        {!pregnancy && (
          <View style={styles.warningBox}>
            <Text style={styles.warningBoxText}>
              ⚠️ Please create an active pregnancy first before adding dummy data.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, (dummyDataLoading || dummyDataAdded || !pregnancy) && styles.buttonDisabled]}
          onPress={handleAddDummyData}
          disabled={dummyDataLoading || dummyDataAdded || !pregnancy}
        >
          {dummyDataLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {dummyDataAdded ? '✓ Dummy Data Added' : 'Add Dummy Data'}
            </Text>
          )}
        </TouchableOpacity>

        {dummyDataAdded && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              ✓ Data successfully added! Check your Timeline, Hospital Visits, and Symptoms screens to see the data.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔑 Test Email Account</Text>
        <Text style={styles.cardDescription}>
          Create a pre-configured test account for email/password sign-in testing.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Credentials:</Text>
          <Text style={styles.infoItem}>• Email: {TEST_EMAIL}</Text>
          <Text style={styles.infoItem}>• Password: {TEST_PASSWORD}</Text>
          <Text style={styles.infoItem}>• Verification email will be sent on creation</Text>
          <Text style={styles.infoItem}>• Skip verification via Firebase Console if needed</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.testAccountButton, (testAccountLoading || testAccountCreated) && styles.buttonDisabled]}
          onPress={handleCreateTestAccount}
          disabled={testAccountLoading || testAccountCreated}
        >
          {testAccountLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {testAccountCreated ? '✓ Test Account Created' : 'Create Test Account'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🖼️ Week Images</Text>
        <Text style={styles.cardDescription}>
          Upload images for each pregnancy week. They appear in the Week Detail view when tapping "This Week" on the home screen.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <Text style={styles.infoItem}>• Select a week number (1–40)</Text>
          <Text style={styles.infoItem}>• Pick an image from your photo library</Text>
          <Text style={styles.infoItem}>• Image uploads to Firebase Storage</Text>
          <Text style={styles.infoItem}>• Appears instantly in the app</Text>
        </View>

        {/* Week selector */}
        <Text style={styles.pickerLabel}>Select Week</Text>
        <TouchableOpacity style={styles.pickerTrigger} onPress={openWeekPicker}>
          <Text style={styles.pickerTriggerText}>Week {selectedWeek}</Text>
          <Text style={styles.pickerArrow}>▾</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.imageButton, imageUploading && styles.buttonDisabled]}
          onPress={handleUploadWeekImage}
          disabled={imageUploading}
        >
          {imageUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Upload Week {selectedWeek} Image</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Week picker modal */}
      {showWeekPicker && (
        <Animated.View style={[styles.pickerOverlay, { opacity: weekPickerFade }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeWeekPicker} activeOpacity={1} />
          <Animated.View style={[styles.pickerSheet, { transform: [{ translateY: weekPickerAnim }] }]}>
            <Text style={styles.pickerSheetTitle}>Select Week</Text>
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {Array.from({ length: 40 }, (_, i) => i + 1).map((week) => (
                <TouchableOpacity
                  key={week}
                  style={[styles.pickerItem, selectedWeek === week && styles.pickerItemSelected]}
                  onPress={() => { setSelectedWeek(week); closeWeekPicker(); }}
                >
                  <Text style={[styles.pickerItemText, selectedWeek === week && styles.pickerItemTextSelected]}>
                    Week {week}
                  </Text>
                  {selectedWeek === week && <Text style={styles.pickerCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      )}

      <View style={styles.warningCard}>
        <Text style={styles.warningTitle}>⚠️ Important Notes</Text>
        <Text style={styles.warningText}>
          • Week data initialization only needs to be run once{'\n'}
          • If data already exists, it will be overwritten{'\n'}
          • Dummy data is for testing and can be deleted manually{'\n'}
          • You can verify the data in Firebase Console{'\n'}
          • After setup, you can delete this admin screen
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoItem: {
    fontSize: 13,
    color: '#666',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#81bec1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  secondaryButton: {
    backgroundColor: '#FF9800',
  },
  testAccountButton: {
    backgroundColor: '#6c5ce7',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successBox: {
    backgroundColor: '#d4edda',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  successText: {
    fontSize: 14,
    color: '#155724',
    lineHeight: 20,
  },
  warningCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 12,
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 20,
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  warningBoxText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },

  // Image upload section
  imageButton: {
    backgroundColor: '#5C6BC0',
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pickerTriggerText: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  pickerArrow: {
    fontSize: 14,
    color: '#888',
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  pickerSheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerList: {
    flexGrow: 0,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerItemSelected: {
    backgroundColor: '#f0fafb',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  pickerItemText: {
    fontSize: 15,
    color: '#333',
  },
  pickerItemTextSelected: {
    color: '#81bec1',
    fontWeight: '700',
  },
  pickerCheck: {
    fontSize: 16,
    color: '#81bec1',
    fontWeight: '700',
  },
});
