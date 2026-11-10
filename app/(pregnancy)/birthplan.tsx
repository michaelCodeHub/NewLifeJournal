import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { Icon, IconName } from '../../components/ui/Icon';
import * as Print from 'expo-print';
import { useAuth } from '../../context/AuthContext';
import { usePregnancy } from '../../context/PregnancyContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { Theme, useThemedStyles, SPACE } from '../../context/ThemeContext';
import PremiumGate from '../../components/PremiumGate';
import {
  Card,
  Chip,
  HeaderAction,
  IconTile,
  Screen,
  ScreenState,
  Text,
  TextField,
  Tone,
  useToast,
} from '../../components/ui';
import {
  BirthPlanSection,
  BIRTH_PLAN_SECTIONS,
  DEFAULT_SECTIONS,
  saveBirthPlan,
  subscribeToBirthPlan,
  exportBirthPlanText,
  buildBirthPlanHtml,
} from '../../services/firebase/birthPlanService';

const TITLE = 'Birth plan';

const SECTION_STYLE: Record<string, { icon: IconName; tone: Tone }> = {
  'Pain Management': { icon: 'medical-outline', tone: 'teal' },
  'Labor Preferences': { icon: 'pulse-outline', tone: 'plum' },
  'Delivery Preferences': { icon: 'heart-outline', tone: 'red' },
  'After Delivery': { icon: 'happy-outline', tone: 'gold' },
  'Special Requests': { icon: 'sparkles-outline', tone: 'blue' },
};

/** Older saved plans may have fewer sections than the template; pad so every card is editable. */
const padSections = (prev: BirthPlanSection[]): BirthPlanSection[] =>
  prev.length >= BIRTH_PLAN_SECTIONS.length
    ? prev
    : [
        ...prev,
        ...BIRTH_PLAN_SECTIONS.slice(prev.length).map((def) => ({ title: def.title, selectedOptions: [], notes: '' })),
      ];

interface SectionCardProps {
  sectionDef: { title: string; options: readonly string[] };
  section: BirthPlanSection;
  sectionIdx: number;
  onToggle: (sectionIdx: number, option: string) => void;
  onNotesChange: (sectionIdx: number, notes: string) => void;
}

// Memoized so typing in one section's notes doesn't re-render every other
// section (which was causing input lag / cursor jitter).
const SectionCard = memo(function SectionCard({ sectionDef, section, sectionIdx, onToggle, onNotesChange }: SectionCardProps) {
  const styles = useThemedStyles(makeStyles);
  const look = SECTION_STYLE[sectionDef.title] ?? { icon: 'document-text-outline', tone: 'teal' as Tone };
  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <IconTile name={look.icon} tone={look.tone} size={32} />
        <Text variant="headline" style={{ flex: 1 }} numberOfLines={1}>
          {sectionDef.title}
        </Text>
      </View>

      <View style={styles.chips}>
        {sectionDef.options.map((option) => (
          <Chip
            key={option}
            label={option}
            selected={section.selectedOptions.includes(option)}
            onPress={() => onToggle(sectionIdx, option)}
          />
        ))}
      </View>

      <TextField
        multiline
        placeholder="Additional notes…"
        value={section.notes}
        onChangeText={(text) => onNotesChange(sectionIdx, text)}
        accessibilityLabel={`${sectionDef.title} notes`}
      />
    </Card>
  );
});

export default function BirthPlanScreen() {
  const { user } = useAuth();
  const { pregnancy, loading } = usePregnancy();
  const { isPremium } = useSubscription();
  const styles = useThemedStyles(makeStyles);
  const toast = useToast();

  const [sections, setSections] = useState<BirthPlanSection[]>(DEFAULT_SECTIONS);
  const [dirty, setDirty] = useState(false);
  // Read latest dirty state inside the subscription without re-subscribing.
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  const uid = user?.uid;
  const pid = pregnancy?.id;

  // Subscribe to Firestore and load existing plan
  useEffect(() => {
    if (!uid || !pid) return;
    const unsubscribe = subscribeToBirthPlan(uid, pid, (plan) => {
      // Don't overwrite unsaved local edits when a remote snapshot arrives.
      if (plan && !dirtyRef.current) {
        setSections(plan.sections);
      }
    });
    return () => unsubscribe();
  }, [uid, pid]);

  const markEdited = useCallback(() => setDirty(true), []);

  const toggleOption = useCallback(
    (sectionIdx: number, option: string) => {
      markEdited();
      setSections((prev) => {
        return padSections(prev).map((s, i) => {
          if (i !== sectionIdx) return s;
          const already = s.selectedOptions.includes(option);
          return {
            ...s,
            selectedOptions: already ? s.selectedOptions.filter((o) => o !== option) : [...s.selectedOptions, option],
          };
        });
      });
    },
    [markEdited],
  );

  const updateNotes = useCallback(
    (sectionIdx: number, notes: string) => {
      markEdited();
      setSections((prev) => {
        return padSections(prev).map((s, i) => (i === sectionIdx ? { ...s, notes } : s));
      });
    },
    [markEdited],
  );

  // Auto-save: write ~0.8s after the last edit, and flush anything pending
  // when leaving the screen. No Save button to forget.
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const idsRef = useRef({ uid, pid });
  idsRef.current = { uid, pid };

  const persist = useCallback(async () => {
    const { uid: u, pid: p } = idsRef.current;
    if (!u || !p || !dirtyRef.current) return;
    try {
      await saveBirthPlan(u, p, sectionsRef.current);
      setDirty(false);
    } catch (err: any) {
      console.error('Error saving birth plan:', err);
      toast.show('Could not save your birth plan', 'error');
    }
  }, [toast]);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(persist, 800);
    return () => clearTimeout(t);
  }, [dirty, sections, persist]);

  useEffect(() => () => void persist(), [persist]);

  const handleShare = async () => {
    if (!pregnancy) return;
    try {
      const text = exportBirthPlanText(pregnancy.motherName, sections);
      await Share.share({ message: text, title: 'My birth plan' });
    } catch (err: any) {
      toast.show(err?.message || 'Could not open the share sheet', 'error');
    }
  };

  const handlePrint = async () => {
    if (!pregnancy) return;
    try {
      const html = buildBirthPlanHtml(pregnancy.motherName, sections);
      await Print.printAsync({ html });
    } catch (err: any) {
      toast.show(err?.message || 'Could not open the print dialog', 'error');
    }
  };

  if (!isPremium) {
    return (
      // PremiumGate draws its own back-button header; don't wrap it in another Screen.
      <PremiumGate
        title="Birth plan"
        description="Build and share a personalised birth plan covering your preferences with Plus."
        icon="clipboard"
        preview="birthplan"
      >
        {null}
      </PremiumGate>
    );
  }

  if (loading) {
    return (
      <Screen header={{ variant: 'bar', title: TITLE }} scroll={false}>
        <ScreenState loading />
      </Screen>
    );
  }

  if (!pregnancy) {
    return (
      <Screen header={{ variant: 'bar', title: TITLE }} scroll={false}>
        <ScreenState icon="leaf-outline" title="No active pregnancy" body="Create a pregnancy profile to build your birth plan." />
      </Screen>
    );
  }

  return (
    <Screen
      header={{
        variant: 'bar',
        title: TITLE,
        right: (
          <>
            <HeaderAction name="print-outline" onPress={handlePrint} accessibilityLabel="Print birth plan" />
            <HeaderAction name="share-outline" onPress={handleShare} accessibilityLabel="Share birth plan" />
          </>
        ),
      }}
      contentStyle={styles.content}
      scrollProps={{ automaticallyAdjustKeyboardInsets: true }}
    >
      <Text variant="callout" color="textSecondary">
        Choose what matters to you for labor and delivery. Changes save as you go — print or share it with your care team
        anytime.
      </Text>

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
    </Screen>
  );
}

const makeStyles = (_: Theme) =>
  StyleSheet.create({
    content: { paddingTop: SPACE.lg, gap: SPACE.lg },
    card: { gap: SPACE.md },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  });
