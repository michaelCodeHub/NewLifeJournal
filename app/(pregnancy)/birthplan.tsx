import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Share,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import * as Print from 'expo-print';
import { useAuth } from '../../context/AuthContext';
import { usePregnancy } from '../../context/PregnancyContext';
import { useSubscription } from '../../context/SubscriptionContext';
import PremiumGate from '../../components/PremiumGate';
import {
  BirthPlanSection,
  BIRTH_PLAN_SECTIONS,
  DEFAULT_SECTIONS,
  saveBirthPlan,
  subscribeToBirthPlan,
  exportBirthPlanText,
  buildBirthPlanHtml,
} from '../../services/firebase/birthPlanService';

const PRIMARY = '#81bec1';
const BACKGROUND = '#E0F2F3';

const optionStyle = (selected: boolean) => ({
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 20,
  borderWidth: 1.5,
  borderColor: selected ? PRIMARY : '#ccc',
  backgroundColor: selected ? PRIMARY : 'white',
  margin: 4,
});

const optionTextStyle = (selected: boolean) => ({
  color: selected ? 'white' : '#555',
  fontSize: 13,
});

interface SectionCardProps {
  sectionDef: { title: string; options: readonly string[] };
  section: BirthPlanSection;
  sectionIdx: number;
  onToggle: (sectionIdx: number, option: string) => void;
  onNotesChange: (sectionIdx: number, notes: string) => void;
}

// Memoized so typing in one section's notes doesn't re-render every other
// section (which was causing input lag / cursor jitter).
const SectionCard = React.memo(function SectionCard({
  sectionDef,
  section,
  sectionIdx,
  onToggle,
  onNotesChange,
}: SectionCardProps) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{sectionDef.title}</Text>

      {/* Chip options */}
      <View style={styles.chipsRow}>
        {sectionDef.options.map((option) => {
          const selected = section.selectedOptions.includes(option);
          return (
            <TouchableOpacity
              key={option}
              style={optionStyle(selected)}
              onPress={() => onToggle(sectionIdx, option)}
              activeOpacity={0.75}
            >
              <Text style={optionTextStyle(selected)}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Notes input */}
      <TextInput
        style={styles.notesInput}
        multiline
        placeholder="Additional notes…"
        placeholderTextColor="#aaa"
        value={section.notes}
        onChangeText={(text) => onNotesChange(sectionIdx, text)}
      />
    </View>
  );
});

export default function BirthPlanScreen() {
  const { user } = useAuth();
  const { pregnancy, loading } = usePregnancy();
  const { isPremium } = useSubscription();


  const [sections, setSections] = useState<BirthPlanSection[]>(DEFAULT_SECTIONS);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);
  // Read latest dirty state inside the subscription without re-subscribing.
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  // Subscribe to Firestore and load existing plan
  useEffect(() => {
    if (!user || !pregnancy) return;

    const unsubscribe = subscribeToBirthPlan(user.uid, pregnancy.id, (plan) => {
      // Don't overwrite unsaved local edits when a remote snapshot arrives.
      if (plan && !dirtyRef.current) {
        setSections(plan.sections);
      }
    });

    return () => unsubscribe();
  }, [user, pregnancy]);

  const markEdited = useCallback(() => setDirty(true), []);

  const toggleOption = useCallback((sectionIdx: number, option: string) => {
    markEdited();
    setSections(prev => prev.map((s, i) => {
      if (i !== sectionIdx) return s;
      const already = s.selectedOptions.includes(option);
      return {
        ...s,
        selectedOptions: already
          ? s.selectedOptions.filter(o => o !== option)
          : [...s.selectedOptions, option],
      };
    }));
  }, [markEdited]);

  const updateNotes = useCallback((sectionIdx: number, notes: string) => {
    markEdited();
    setSections(prev => prev.map((s, i) => {
      if (i !== sectionIdx) return s;
      return { ...s, notes };
    }));
  }, [markEdited]);

  const handleSave = async () => {
    if (!user || !pregnancy || saveStatus === 'saving') return;
    setSaveStatus('saving');
    try {
      await saveBirthPlan(user.uid, pregnancy.id, sections);
      setDirty(false);
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch {
      setSaveStatus('error');
    }
  };

  const handleShare = async () => {
    if (!pregnancy) return;
    const text = exportBirthPlanText(pregnancy.motherName, sections);
    await Share.share({ message: text, title: 'My Birth Plan' });
  };

  const handlePrint = async () => {
    if (!pregnancy) return;
    try {
      const html = buildBirthPlanHtml(pregnancy.motherName, sections);
      await Print.printAsync({ html });
    } catch (err: any) {
      Alert.alert('Print failed', err?.message || 'Could not open the print dialog.');
    }
  };

  const getSaveIndicatorText = (): string => {
    if (saveStatus === 'error') return 'Save failed';
    if (saveStatus === 'saved' && lastSaved) {
      const diffMs = Date.now() - lastSaved.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Saved just now';
      return `Last saved: ${diffMins} min ago`;
    }
    return 'All changes saved';
  };

  if (!isPremium) {
    return (
      <PremiumGate
        title="Birth Plan"
        description="Build and share a personalized birth plan covering your preferences with Premium."
        icon="clipboard"
      >
        {null}
      </PremiumGate>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Birth Plan" />
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
      </View>
    );
  }

  const headerActions = (
    <View style={styles.headerActions}>
      <TouchableOpacity style={styles.headerBtn} onPress={handlePrint}>
        <Text style={styles.headerBtnText}>Print</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.headerBtn} onPress={handleShare}>
        <Text style={styles.headerBtnText}>Share</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScreenHeader title="Birth Plan" rightElement={headerActions} />

      {/* Status / Save row — shows a Save button only when there are unsaved
          edits, otherwise shows the saved status. Fixed height so toggling it
          never shifts the content below. */}
      <View style={styles.saveIndicatorRow}>
        {dirty ? (
          <>
            <Text style={styles.unsavedText}>Unsaved changes</Text>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saveStatus === 'saving'}
              activeOpacity={0.8}
            >
              {saveStatus === 'saving' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <Text style={[
            styles.saveIndicatorText,
            saveStatus === 'error' && styles.saveIndicatorError,
          ]}>
            {getSaveIndicatorText()}
          </Text>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {BIRTH_PLAN_SECTIONS.map((sectionDef, sectionIdx) => {
          const sectionState = sections[sectionIdx] ?? { title: sectionDef.title, selectedOptions: [], notes: '' };
          return (
            <SectionCard
              key={sectionDef.title}
              sectionDef={sectionDef}
              section={sectionState}
              sectionIdx={sectionIdx}
              onToggle={toggleOption}
              onNotesChange={updateNotes}
            />
          );
        })}

        {/* Bottom padding so last section isn't hidden behind tab bar */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    borderWidth: 1.5,
    borderColor: '#81bec1',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  headerBtnText: {
    color: '#81bec1',
    fontSize: 14,
    fontWeight: '600',
  },
  saveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    height: 44,
    backgroundColor: BACKGROUND,
  },
  saveIndicatorText: {
    fontSize: 12,
    color: '#888',
  },
  saveIndicatorError: {
    color: '#F44336',
  },
  unsavedText: {
    fontSize: 12,
    color: '#888',
    marginRight: 12,
  },
  saveBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 22,
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#333',
    minHeight: 56,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
  },
  bottomPadding: {
    height: 100,
  },
});
