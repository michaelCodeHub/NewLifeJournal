import { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, IconName } from '../ui/Icon';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Theme, useTheme, useThemedStyles, SPACE, GUTTER } from '../../context/ThemeContext';
import { Card, SectionHeader, Text } from '../ui';
import { AssistantAvatar } from './MessageBubble';

/** Trimester questions used to fill the list. */
const byStage = (week: number): string[] => {
  if (week <= 12) {
    return [
      'What foods should I avoid?',
      'Is nausea normal at this stage?',
      'When should I schedule my first ultrasound?',
      'How can I manage first-trimester tiredness?',
    ];
  }
  if (week <= 27) {
    return [
      'What foods should I avoid?',
      'What should I know about the anatomy scan?',
      'When will I start feeling kicks?',
      'Which exercises are safe right now?',
    ];
  }
  return [
    'What should I pack in my hospital bag?',
    'What foods should I avoid?',
    'What are signs of labor starting?',
    'How can I sleep better in the third trimester?',
  ];
};

/**
 * Four starter questions (PRD F26): what the baby is doing this week, whether
 * the latest logged symptom is normal, then stage-appropriate questions.
 */
export const getQuickSuggestions = (week: number, latestSymptom?: string): string[] => {
  const out = [`What's my baby doing at week ${week}?`];
  const symptom = latestSymptom?.trim();
  if (symptom) out.push(`Is ${symptom.toLowerCase()} normal at week ${week}?`);
  for (const q of byStage(week)) {
    if (out.length >= 4) break;
    if (!out.includes(q)) out.push(q);
  }
  return out;
};

/** Starter questions for baby mode, by age in days. */
export const getBabySuggestions = (ageDays: number): string[] => {
  if (ageDays < 42) {
    return [
      'How often should a newborn feed?',
      'How many wet diapers are normal at this age?',
      'How can I tell if my baby is getting enough milk?',
      'How do I look after my body after giving birth?',
    ];
  }
  if (ageDays < 180) {
    return [
      'How much should my baby sleep at this age?',
      'Which vaccines come next?',
      'Is it normal for feeds to get shorter?',
      'How can I build a gentle bedtime routine?',
    ];
  }
  return [
    'How do I start solid foods?',
    'Which foods should I avoid for my baby?',
    'How much milk does my baby need with solids?',
    'What milestones come next?',
  ];
};

const Suggestion = memo(function Suggestion({
  text,
  index,
  disabled,
  onPress,
}: {
  text: string;
  index: number;
  disabled: boolean;
  onPress: (text: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Animated.View entering={FadeInDown.delay(60 + index * 50).duration(260)}>
      <Card
        onPress={disabled ? undefined : () => onPress(text)}
        style={styles.suggestion}
        accessibilityLabel={`Ask: ${text}`}
      >
        <Text variant="calloutMedium" style={styles.suggestionText}>
          {text}
        </Text>
        <Icon name="arrow-up-circle" size={22} color={colors.primaryDark} />
      </Card>
    </Animated.View>
  );
});

export function ChatEmptyState({
  week,
  name,
  disabled,
  onSuggestion,
  latestSymptom,
  title,
  intro,
  suggestions: suggestionsOverride,
}: {
  week: number;
  name?: string;
  disabled: boolean;
  onSuggestion: (text: string) => void;
  /** Title of the most recently logged symptom, for "Is … normal?". */
  latestSymptom?: string;
  /** Baby mode passes its own heading, intro and starter questions. */
  title?: string;
  intro?: string;
  suggestions?: string[];
}) {
  const styles = useThemedStyles(makeStyles);
  const suggestions = suggestionsOverride ?? getQuickSuggestions(week, latestSymptom);
  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <AssistantAvatar size={52} />
        <Text variant="title2" align="center">
          {title ?? `Week ${week} companion`}
        </Text>
        <Text variant="callout" color="textSecondary" align="center" style={styles.heroBody}>
          {name ? `Hi ${name}. ` : ''}
          {intro ?? 'Ask anything about this stage of your pregnancy — symptoms, food, sleep or what comes next.'}
        </Text>
      </View>

      <View>
        <SectionHeader title="Try asking" />
        <View style={styles.list}>
          {suggestions.map((s, i) => (
            <Suggestion key={s} text={s} index={i} disabled={disabled} onPress={onSuggestion} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const makeStyles = (_: Theme) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingHorizontal: GUTTER, paddingTop: SPACE.xxl, paddingBottom: SPACE.xl, gap: SPACE.xxl },
    hero: { alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.lg },
    heroBody: { maxWidth: 320 },
    list: { gap: SPACE.sm },
    suggestion: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.md + 2 },
    suggestionText: { flex: 1 },
  });
