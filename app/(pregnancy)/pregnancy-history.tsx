import { useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { Theme, useThemedStyles, useTheme, SPACE, GUTTER, RADIUS } from '../../context/ThemeContext';
import { Card, EmptyState, Header, IconTile, Pill, ScreenState, Text, Tone } from '../../components/ui';
import type { IconName } from '../../components/ui/Icon';
import {
  subscribeToHospitalVisits,
  subscribeToMilestones,
  subscribeToSymptoms,
} from '../../services/firebase/pregnancyService';
import { longDate, SEVERITY, shortDate, symptomIcon, symptomTitle, visitIcon, visitTitle } from '../../lib/journal';
import type { HospitalVisit, Milestone, Pregnancy, Symptom } from '../../types';

interface Row {
  key: string;
  week: number;
  millis: number;
  title: string;
  meta: string;
  notes?: string;
  icon: IconName;
  tone: Tone;
  severity?: 1 | 2 | 3 | 4 | 5;
}

/**
 * A pregnancy journal, read-only, grouped by week: "Before you were born" for
 * the pregnancy a baby came from (PRD F07), or any past pregnancy from
 * Profile → Past pregnancies (F31).
 */
export default function PregnancyHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [pregnancy, setPregnancy] = useState<Pregnancy | null>(null);
  const [missing, setMissing] = useState(false);
  const [visits, setVisits] = useState<HospitalVisit[]>([]);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  const uid = user?.uid;
  useEffect(() => {
    if (!uid || !id) return;
    getDoc(doc(db, 'users', uid, 'pregnancies', id))
      .then((s) => (s.exists() ? setPregnancy({ ...(s.data() as Pregnancy), id: s.id }) : setMissing(true)))
      .catch(() => setMissing(true));
    const subs = [
      subscribeToHospitalVisits(uid, id, setVisits),
      subscribeToSymptoms(uid, id, setSymptoms),
      subscribeToMilestones(uid, id, setMilestones),
    ];
    return () => subs.forEach((u) => u());
  }, [uid, id]);

  const sections = useMemo(() => {
    const rows: Row[] = [
      ...visits.map((v) => ({
        key: `v-${v.id}`,
        week: v.week,
        millis: v.date.toMillis(),
        title: visitTitle(v),
        meta: [shortDate(v.date.toDate()), v.weight ? `${v.weight} kg` : null, v.bloodPressure ? `BP ${v.bloodPressure}` : null]
          .filter(Boolean)
          .join(' · '),
        notes: v.notes,
        icon: visitIcon(v),
        tone: 'green' as Tone,
      })),
      ...symptoms.map((s) => ({
        key: `s-${s.id}`,
        week: s.week,
        millis: s.date.toMillis(),
        title: symptomTitle(s),
        meta: shortDate(s.date.toDate()),
        notes: s.notes,
        icon: symptomIcon(s),
        tone: 'orange' as Tone,
        severity: s.severity,
      })),
      ...milestones.map((m) => ({
        key: `m-${m.id}`,
        week: m.week,
        millis: m.date.toMillis(),
        title: m.title,
        meta: shortDate(m.date.toDate()),
        notes: m.description,
        icon: 'star-outline' as IconName,
        tone: 'gold' as Tone,
      })),
    ].sort((a, b) => b.millis - a.millis);
    const byWeek = new Map<number, Row[]>();
    for (const r of rows) {
      const list = byWeek.get(r.week);
      if (list) list.push(r);
      else byWeek.set(r.week, [r]);
    }
    return [...byWeek.entries()].sort((a, b) => b[0] - a[0]).map(([week, data]) => ({ week, data }));
  }, [visits, symptoms, milestones]);

  if (missing) return <ScreenState icon="book-outline" title="This pregnancy journal isn't available" />;
  if (!pregnancy) return <ScreenState loading />;

  const born = pregnancy.birthDate?.toDate();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Header variant="bar" title={pregnancy.transitionedToBabyId ? 'Before you were born' : 'Pregnancy journal'} />
      <SectionList
        sections={sections}
        keyExtractor={(r) => r.key}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Card tone="tinted" tint="goldTint" style={styles.summary}>
            <IconTile name="book-outline" tone="gold" size={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="headline">{pregnancy.babyName ? `Waiting for ${pregnancy.babyName}` : 'Your pregnancy journal'}</Text>
              <Text variant="footnote" color="textSecondary">
                Due {longDate(pregnancy.dueDate.toDate())}
                {born ? ` · Born ${longDate(born)}` : ''}
              </Text>
            </View>
          </Card>
        }
        renderSectionHeader={({ section }) => (
          <Text variant="overline" color="textMuted" style={styles.weekHeader}>
            Week {section.week}
          </Text>
        )}
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.cardSlice,
              index === 0 && styles.cardTop,
              index === section.data.length - 1 && styles.cardBottom,
              index < section.data.length - 1 && styles.cardDivider,
            ]}
          >
            <View style={styles.row}>
              <IconTile name={item.icon} tone={item.tone} size={36} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.title}>
                  <Text variant="bodyMedium" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {item.title}
                  </Text>
                  {item.severity ? <Pill label={SEVERITY[item.severity].label} tone={SEVERITY[item.severity].tone} /> : null}
                </View>
                <Text variant="footnote" color="textMuted">
                  {item.meta}
                </Text>
                {item.notes ? (
                  <Text variant="callout" color="textSecondary">
                    {item.notes}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Card style={{ marginTop: SPACE.lg }}>
            <EmptyState icon="calendar-clear-outline" title="No entries in this journal" />
          </Card>
        }
      />
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    root: { flex: 1 },
    listContent: { paddingHorizontal: GUTTER, paddingTop: SPACE.lg, paddingBottom: SPACE.huge },
    summary: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
    weekHeader: { paddingTop: SPACE.xl, paddingBottom: SPACE.sm },
    cardSlice: { backgroundColor: colors.card },
    cardTop: { borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg },
    cardBottom: { borderBottomLeftRadius: RADIUS.lg, borderBottomRightRadius: RADIUS.lg },
    cardDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md, padding: SPACE.md, paddingLeft: SPACE.lg },
    title: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  });
