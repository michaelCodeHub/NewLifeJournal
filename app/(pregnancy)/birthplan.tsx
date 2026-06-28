import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Share,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { usePregnancy } from '../../context/PregnancyContext';
import {
  BirthPlanSection,
  BIRTH_PLAN_SECTIONS,
  DEFAULT_SECTIONS,
  saveBirthPlan,
  subscribeToBirthPlan,
  exportBirthPlanText,
} from '../../services/firebase/birthPlanService';

const PRIMARY = '#81bec1';
const BACKGROUND = '#E0F2F3';

export default function BirthPlanScreen() {
  const { user } = useAuth();
  const { pregnancy, loading } = usePregnancy();

  const [sections, setSections] = useState<BirthPlanSection[]>(DEFAULT_SECTIONS);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Subscribe to Firestore and load existing plan
  useEffect(() => {
    if (!user || !pregnancy) return;

    const unsubscribe = subscribeToBirthPlan(user.uid, pregnancy.id, (plan) => {
      if (plan) {
        setSections(plan.sections);
      }
      setHasLoaded(true);
    });

    return () => unsubscribe();
  }, [user, pregnancy]);

  // Auto-save with 500ms debounce whenever sections change
  useEffect(() => {
    if (!user || !pregnancy || !hasLoaded) return;
    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        await saveBirthPlan(user.uid, pregnancy.id, sections);
        setSaveStatus('saved');
        setLastSaved(new Date());
      } catch {
        setSaveStatus('error');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [sections, user, pregnancy, hasLoaded]);

  const toggleOption = useCallback((sectionIdx: number, option: string) => {
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
  }, []);

  const updateNotes = useCallback((sectionIdx: number, notes: string) => {
    setSections(prev => prev.map((s, i) => {
      if (i !== sectionIdx) return s;
      return { ...s, notes };
    }));
  }, []);

  const handleShare = async () => {
    if (!pregnancy) return;
    const text = exportBirthPlanText(pregnancy.motherName, sections);
    await Share.share({ message: text, title: 'My Birth Plan' });
  };

  const getSaveIndicatorText = (): string => {
    if (saveStatus === 'saving') return 'Saving…';
    if (saveStatus === 'error') return 'Save failed';
    if (saveStatus === 'saved' && lastSaved) {
      const diffMs = Date.now() - lastSaved.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Saved just now';
      return `Last saved: ${diffMins} min ago`;
    }
    return '';
  };

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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Birth Plan</Text>
        </View>
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Birth Plan</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Auto-save indicator */}
      {getSaveIndicatorText() !== '' && (
        <View style={styles.saveIndicatorRow}>
          {saveStatus === 'saving' && (
            <ActivityIndicator size="small" color={PRIMARY} style={{ marginRight: 6 }} />
          )}
          <Text style={[
            styles.saveIndicatorText,
            saveStatus === 'error' && styles.saveIndicatorError,
          ]}>
            {getSaveIndicatorText()}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {BIRTH_PLAN_SECTIONS.map((sectionDef, sectionIdx) => {
          const sectionState = sections[sectionIdx] ?? { title: sectionDef.title, selectedOptions: [], notes: '' };
          return (
            <View key={sectionDef.title} style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{sectionDef.title}</Text>

              {/* Chip options */}
              <View style={styles.chipsRow}>
                {sectionDef.options.map((option) => {
                  const selected = sectionState.selectedOptions.includes(option);
                  return (
                    <TouchableOpacity
                      key={option}
                      style={optionStyle(selected)}
                      onPress={() => toggleOption(sectionIdx, option)}
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
                value={sectionState.notes}
                onChangeText={(text) => updateNotes(sectionIdx, text)}
              />
            </View>
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
  header: {
    backgroundColor: PRIMARY,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  shareBtn: {
    borderWidth: 1.5,
    borderColor: '#fff',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 16,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  saveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: BACKGROUND,
  },
  saveIndicatorText: {
    fontSize: 12,
    color: '#888',
  },
  saveIndicatorError: {
    color: '#F44336',
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
