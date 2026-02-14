import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { usePregnancy } from '../../context/PregnancyContext';
import { useAuth } from '../../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function CreatePregnancyScreen() {
  const router = useRouter();
  const { createPregnancy } = usePregnancy();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form state
  const [motherName, setMotherName] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [babyName, setBabyName] = useState('');
  const [hospital, setHospital] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');

  const handleSubmit = async () => {
    // Validation
    if (!motherName.trim()) {
      Alert.alert('Required Field', 'Please enter your name');
      return;
    }

    if (dueDate < new Date()) {
      Alert.alert('Invalid Date', 'Due date must be in the future');
      return;
    }

    try {
      setLoading(true);

      // Create pregnancy
      await createPregnancy({
        motherName: motherName.trim(),
        dueDate,
        babyName: babyName.trim() || undefined,
        hospital: hospital.trim() || undefined,
        doctorName: doctorName.trim() || undefined,
        doctorPhone: doctorPhone.trim() || undefined,
      });

      // Update user profile to set current mode
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { currentMode: 'pregnancy' });
      }

      // Navigate to pregnancy dashboard
      router.replace('/(pregnancy)/home');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create pregnancy profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Create Pregnancy Profile</Text>
      <Text style={styles.subtitle}>
        Let's start tracking your pregnancy journey
      </Text>

      {/* Mother's Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Your Name *</Text>
        <TextInput
          style={styles.input}
          value={motherName}
          onChangeText={setMotherName}
          placeholder="Enter your name"
          autoCapitalize="words"
        />
      </View>

      {/* Due Date */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Due Date *</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>
            {dueDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dueDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}
      </View>

      {/* Optional Fields */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Baby's Name (Optional)</Text>
        <TextInput
          style={styles.input}
          value={babyName}
          onChangeText={setBabyName}
          placeholder="If you've chosen a name"
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Hospital (Optional)</Text>
        <TextInput
          style={styles.input}
          value={hospital}
          onChangeText={setHospital}
          placeholder="Where you plan to deliver"
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Doctor's Name (Optional)</Text>
        <TextInput
          style={styles.input}
          value={doctorName}
          onChangeText={setDoctorName}
          placeholder="Your OB/GYN"
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Doctor's Phone (Optional)</Text>
        <TextInput
          style={styles.input}
          value={doctorPhone}
          onChangeText={setDoctorPhone}
          placeholder="Contact number"
          keyboardType="phone-pad"
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Create Profile</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
