import { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, IconName } from '../ui/Icon';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Theme, useTheme, useThemedStyles, SPACE, GUTTER } from '../../context/ThemeContext';
import { Card, IconTile, SectionHeader, Text } from '../ui';

/** Four trimester-appropriate starter questions. */
export const getQuickSuggestions = (week: number): string[] => {
  if (week <= 12) {
    return [
      'Is nausea normal at this stage?',
      'What foods should I avoid in the first trimester?',
      'When should I schedule my first ultrasound?',
      'How can I manage first-trimester tiredness?',
    ];
  }
  if (week <= 27) {
    return [
      'What should I know about the anatomy scan?',
      'How much weight gain is normal by now?',
      'When will I start feeling kicks?',
      'Which exercises are safe right now?',
    ];
  }
  return [
    'What should I pack in my hospital bag?',
    'How do I know if contractions are real?',
    'What are signs of labor starting?',
    'How can I sleep better in the third trimester?',
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
}: {
  week: number;
  name?: string;
  disabled: boolean;
  onSuggestion: (text: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const suggestions = getQuickSuggestions(week);
  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <IconTile name="sparkles" tone="teal" size={52} />
        <Text variant="title2" align="center">
          Week {week} companion
        </Text>
        <Text variant="callout" color="textSecondary" align="center" style={styles.heroBody}>
          {name ? `Hi ${name}. ` : ''}Ask anything about this stage of your pregnancy — symptoms, food, sleep or what
          comes next.
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
