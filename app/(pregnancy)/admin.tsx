import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { httpsCallable } from 'firebase/functions';
import { initializeWeekData } from '../../services/firebase/weekInfoService';
import { uploadWeekImage } from '../../services/firebase/storageService';
import { useAuth } from '../../context/AuthContext';
import { usePregnancy } from '../../context/PregnancyContext';
import { addHospitalVisit, addSymptom } from '../../services/firebase/pregnancyService';
import { signUpWithEmail } from '../../services/emailAuth';
import { Timestamp } from 'firebase/firestore';
import { functions } from '../../config/firebase';
import { useSubscription } from '../../context/SubscriptionContext';
import { Theme, useThemedStyles, RADIUS, SPACE } from '../../context/ThemeContext';
import {
  Button,
  Card,
  ConfirmSheet,
  IconTile,
  OptionSheet,
  Option,
  Pill,
  Screen,
  SelectField,
  Text,
  Tone,
  useToast,
} from '../../components/ui';

const TEST_EMAIL = 'test@newlifejournal.app';
const TEST_PASSWORD = 'TestUser123!';

const WEEK_OPTIONS: Option<string>[] = Array.from({ length: 40 }, (_, i) => ({
  value: String(i + 1),
  label: `Week ${i + 1}`,
}));

// Calls the admin-claim-gated `devSetTier` Cloud Function — see
// functions/src/devTools.ts. The client can no longer write
// `devTierOverride` to Firestore directly (firestore.rules blocks it), and
// the function itself rejects the call unless the caller's account has the
// `admin: true` custom claim, so this button is inert for everyone except a
// developer who has explicitly granted themselves that claim.
const setDevTierOverride = httpsCallable<{ override: 'free' | 'premium' | null }, { ok: boolean }>(
  functions,
  'devSetTier'
);

// This entire screen is a developer/QA tool: seeding shared week content,
// generating dummy timeline data, and forcing a subscription tier for
// testing. None of that belongs in front of real users, so the whole screen
// is inert in production builds — `__DEV__` is false in release bundles.
// (Kept as a thin wrapper, rather than an early-return inside the component
// with hooks, so the Rules of Hooks stay satisfied either way.)
export default function AdminScreen() {
  if (!__DEV__) {
    return <Redirect href="/(pregnancy)/(tabs)/home" />;
  }
  return <AdminScreenDevOnly />;
}

function AdminScreenDevOnly() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { pregnancy } = usePregnancy();
  const { tier: resolvedTier, refresh: refreshSubscription } = useSubscription();
  const toast = useToast();
  const styles = useThemedStyles(makeStyles);
  const [tierOverrideLoading, setTierOverrideLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [dummyDataLoading, setDummyDataLoading] = useState(false);
  const [dummyDataAdded, setDummyDataAdded] = useState(false);
  const [testAccountLoading, setTestAccountLoading] = useState(false);
  const [testAccountCreated, setTestAccountCreated] = useState(false);
  const [confirmInit, setConfirmInit] = useState(false);
  const [confirmDummy, setConfirmDummy] = useState(false);

  // Week image upload state
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const handleUploadWeekImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.show('Photo library access is needed to upload week images', 'error');
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
      toast.show(`Week ${selectedWeek} image uploaded`, 'success');
    } catch (error: any) {
      toast.show(error.message || 'Failed to upload image', 'error');
    } finally {
      setImageUploading(false);
    }
  };

  const runInitialize = async () => {
    try {
      setLoading(true);
      await initializeWeekData();
      setInitialized(true);
      toast.show('Week data initialized', 'success');
    } catch (error: any) {
      toast.show(error.message || 'Failed to initialize data', 'error');
    } finally {
      setLoading(false);
    }
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

  const handleAddDummyData = () => {
    if (!user || !pregnancy) {
      toast.show('Create an active pregnancy before adding dummy data', 'error');
      return;
    }
    setConfirmDummy(true);
  };

  const runAddDummyData = async () => {
    if (!user || !pregnancy) return;
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
      toast.show(`Added ${hospitalVisits.length} visits and ${symptoms.length} symptoms`, 'success');
    } catch (error: any) {
      console.error('Error adding dummy data:', error);
      toast.show(error.message || 'Failed to add dummy data', 'error');
    } finally {
      setDummyDataLoading(false);
    }
  };

  const handleCreateTestAccount = async () => {
    setTestAccountLoading(true);
    const result = await signUpWithEmail(TEST_EMAIL, TEST_PASSWORD);
    setTestAccountLoading(false);
    if (result.success) {
      setTestAccountCreated(true);
      toast.show('Test account created. Verification email sent.', 'success');
    } else if (result.error?.includes('email-already-in-use')) {
      toast.show('Test account already exists', 'info');
    } else {
      toast.show(result.error || 'Failed to create test account', 'error');
    }
  };

  // DEV-ONLY: manually force a tier so gating UX can be tested before real
  // RevenueCat/store products exist — see MONETIZATION_PLAN.md. Routed
  // through the admin-claim-gated `devSetTier` Cloud Function rather than a
  // direct Firestore write, since firestore.rules no longer allows clients
  // to write `devTierOverride` themselves (see functions/src/devTools.ts).
  const handleSetTierOverride = async (override: 'free' | 'premium' | null) => {
    if (!user) return;
    setTierOverrideLoading(true);
    try {
      await setDevTierOverride({ override });
      await refreshUserProfile();
      await refreshSubscription();
      toast.show(override ? `Tier forced to ${override}` : 'Tier override cleared', 'success');
    } catch (error: any) {
      toast.show(
        error.message || 'Failed to set tier override. Requires an admin custom claim (see functions/src/devTools.ts).',
        'error'
      );
    } finally {
      setTierOverrideLoading(false);
    }
  };

  const weekValue = useMemo(() => String(selectedWeek), [selectedWeek]);

  return (
    <Screen header={{ variant: 'bar', title: 'Developer tools' }} contentStyle={styles.content}>
      {/* Subscription tier */}
      <Card style={styles.card}>
        <CardHead
          icon="sparkles-outline"
          tone="plum"
          title="Force subscription tier"
          body="Testing-only toggle to preview free vs. premium gating before real store products exist."
        />
        <View style={styles.inlineRow}>
          <Text variant="footnote" color="textSecondary">
            Resolved tier
          </Text>
          <Pill label={resolvedTier} tone={resolvedTier === 'premium' ? 'plum' : 'neutral'} />
          {userProfile?.devTierOverride ? <Pill label={`override: ${userProfile.devTierOverride}`} tone="gold" /> : null}
        </View>
        <View style={styles.buttonRow}>
          <Button
            title="Free"
            variant="secondary"
            size="sm"
            style={styles.flex}
            disabled={tierOverrideLoading}
            onPress={() => handleSetTierOverride('free')}
          />
          <Button
            title="Premium"
            variant="tinted"
            size="sm"
            style={styles.flex}
            disabled={tierOverrideLoading}
            onPress={() => handleSetTierOverride('premium')}
          />
          <Button
            title="Clear"
            variant="ghost"
            size="sm"
            style={styles.flex}
            loading={tierOverrideLoading}
            onPress={() => handleSetTierOverride(null)}
          />
        </View>
      </Card>

      {/* Week data */}
      <Card style={styles.card}>
        <CardHead
          icon="book-outline"
          tone="teal"
          title="Pregnancy week data"
          body="Populate Firestore with week information: baby development, body changes and tips for each week."
        />
        <InfoList
          title="What will be created"
          items={[
            '40 week documents (weeks 1–40)',
            'Baby size, length, and weight data',
            'Baby development milestones',
            'Mother changes and symptoms',
            'Weekly tips and recommendations',
          ]}
        />
        <Button
          title={initialized ? 'Data initialized' : 'Initialize week data'}
          icon={initialized ? 'checkmark-circle' : 'cloud-upload-outline'}
          fullWidth
          loading={loading}
          disabled={initialized}
          onPress={() => setConfirmInit(true)}
        />
        {initialized ? (
          <SuccessNote text="Week data initialized. Week-specific information now shows on the home screen." />
        ) : null}
      </Card>

      {/* Dummy data */}
      <Card style={styles.card}>
        <CardHead
          icon="flask-outline"
          tone="orange"
          title="Add dummy data"
          body="Add realistic hospital visits and symptoms throughout your pregnancy timeline for testing."
        />
        <InfoList
          title="What will be added"
          items={[
            '15 hospital visits (checkups, ultrasounds, tests)',
            '27 symptoms with severity levels',
            'Spread across all three trimesters',
            'Realistic dates based on your pregnancy',
            'Detailed notes for each entry',
          ]}
        />
        {!pregnancy ? (
          <View style={styles.warnNote}>
            <IconTile name="alert-circle-outline" tone="gold" size={28} />
            <Text variant="footnote" color="textSecondary" style={styles.flex}>
              Create an active pregnancy first before adding dummy data.
            </Text>
          </View>
        ) : null}
        <Button
          title={dummyDataAdded ? 'Dummy data added' : 'Add dummy data'}
          icon={dummyDataAdded ? 'checkmark-circle' : 'add-circle-outline'}
          variant="secondary"
          fullWidth
          loading={dummyDataLoading}
          disabled={dummyDataAdded || !pregnancy}
          onPress={handleAddDummyData}
        />
        {dummyDataAdded ? (
          <SuccessNote text="Data added. Check your Timeline, Visits, and Symptoms screens." />
        ) : null}
      </Card>

      {/* Test account */}
      <Card style={styles.card}>
        <CardHead
          icon="key-outline"
          tone="blue"
          title="Test email account"
          body="Create a pre-configured account for email/password sign-in testing."
        />
        <InfoList
          title="Credentials"
          items={[
            `Email: ${TEST_EMAIL}`,
            `Password: ${TEST_PASSWORD}`,
            'Verification email will be sent on creation',
            'Skip verification via Firebase Console if needed',
          ]}
        />
        <Button
          title={testAccountCreated ? 'Test account created' : 'Create test account'}
          icon={testAccountCreated ? 'checkmark-circle' : 'person-add-outline'}
          variant="secondary"
          fullWidth
          loading={testAccountLoading}
          disabled={testAccountCreated}
          onPress={handleCreateTestAccount}
        />
      </Card>

      {/* Week images */}
      <Card style={styles.card}>
        <CardHead
          icon="image-outline"
          tone="green"
          title="Week images"
          body="Upload an image for a pregnancy week. It appears in the Week Detail view."
        />
        <InfoList
          title="How it works"
          items={[
            'Select a week number (1–40)',
            'Pick an image from your photo library',
            'Image uploads to Firebase Storage',
            'Appears instantly in the app',
          ]}
        />
        <SelectField
          label="Week"
          value={`Week ${selectedWeek}`}
          icon="calendar-outline"
          onPress={() => setShowWeekPicker(true)}
        />
        <Button
          title={`Upload week ${selectedWeek} image`}
          icon="image-outline"
          variant="secondary"
          fullWidth
          loading={imageUploading}
          onPress={handleUploadWeekImage}
        />
      </Card>

      {/* Notes */}
      <Card tone="tinted" tint="goldTint" style={styles.card}>
        <View style={styles.inlineRow}>
          <IconTile name="alert-circle-outline" tone="gold" size={28} />
          <Text variant="headline">Important notes</Text>
        </View>
        <InfoList
          bare
          items={[
            'Week data initialization only needs to be run once',
            'If data already exists, it will be overwritten',
            'Dummy data is for testing and can be deleted manually',
            'You can verify the data in Firebase Console',
            'After setup, you can delete this admin screen',
          ]}
        />
      </Card>

      <OptionSheet
        visible={showWeekPicker}
        onClose={() => setShowWeekPicker(false)}
        title="Select week"
        options={WEEK_OPTIONS}
        value={weekValue}
        onSelect={(v) => setSelectedWeek(Number(v))}
      />

      <ConfirmSheet
        visible={confirmInit}
        onClose={() => setConfirmInit(false)}
        destructive={false}
        title="Initialize week data?"
        body="This writes week information for all 40 weeks to Firestore, overwriting existing week documents."
        confirmLabel="Initialize"
        onConfirm={runInitialize}
      />

      <ConfirmSheet
        visible={confirmDummy}
        onClose={() => setConfirmDummy(false)}
        destructive={false}
        title="Add dummy data?"
        body="This adds realistic hospital visits and symptoms throughout your pregnancy timeline."
        confirmLabel="Add data"
        onConfirm={runAddDummyData}
      />
    </Screen>
  );
}

/* ------------------------------------------------------------ sub-parts */

function CardHead({
  icon,
  tone,
  title,
  body,
}: {
  icon: React.ComponentProps<typeof IconTile>['name'];
  tone: Tone;
  title: string;
  body: string;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.head}>
      <IconTile name={icon} tone={tone} size={36} />
      <View style={[styles.flex, { gap: 2 }]}>
        <Text variant="headline">{title}</Text>
        <Text variant="footnote" color="textSecondary">
          {body}
        </Text>
      </View>
    </View>
  );
}

function InfoList({ title, items, bare }: { title?: string; items: string[]; bare?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={bare ? styles.infoBare : styles.info}>
      {title ? (
        <Text variant="overline" color="textMuted">
          {title}
        </Text>
      ) : null}
      {items.map((item, i) => (
        <View key={i} style={styles.bullet}>
          <View style={styles.dot} />
          <Text variant="footnote" color="textSecondary" style={styles.flex}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

function SuccessNote({ text }: { text: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.successNote}>
      <IconTile name="checkmark-circle-outline" tone="green" size={28} />
      <Text variant="footnote" color="textSecondary" style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    content: { paddingTop: SPACE.lg, gap: SPACE.lg },
    card: { gap: SPACE.lg },
    flex: { flex: 1 },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
    inlineRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SPACE.sm },
    buttonRow: { flexDirection: 'row', gap: SPACE.sm },
    info: {
      gap: SPACE.sm,
      padding: SPACE.md,
      borderRadius: RADIUS.md,
      backgroundColor: colors.surfaceSecondary,
    },
    infoBare: { gap: SPACE.sm },
    bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textMuted, marginTop: 7 },
    successNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.md,
      padding: SPACE.md,
      borderRadius: RADIUS.md,
      backgroundColor: colors.greenTint,
    },
    warnNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.md,
      padding: SPACE.md,
      borderRadius: RADIUS.md,
      backgroundColor: colors.goldTint,
    },
  });
