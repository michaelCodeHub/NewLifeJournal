import { ScrollView, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Theme, useThemedStyles, SPACE, GUTTER } from '../../context/ThemeContext';
import { Button, Card, IconTile, SectionHeader, Text } from '../ui';
import { AssistantAvatar } from './MessageBubble';
import { IconName } from '../ui/Icon';
import type { Tone } from '../ui';
import { LEGAL } from '../../constants/legal';

const POINTS: { icon: IconName; tone: Tone; title: string; text: string }[] = [
  {
    icon: 'sparkles-outline',
    tone: 'teal',
    title: 'Personal answers',
    text: 'Your question, pregnancy week and recent journal entries go to our AI provider so answers fit your stage.',
  },
  {
    icon: 'lock-closed-outline',
    tone: 'plum',
    title: 'Private',
    text: 'Never used for advertising, never sold or shared.',
  },
  {
    icon: 'medkit-outline',
    tone: 'red',
    title: 'Not a doctor',
    text: 'In an emergency, call your local emergency number or your maternity unit.',
  },
];

/**
 * Shown once, before the first question. Uses the same hero as the chat's
 * empty state so agreeing feels like continuing, not switching screens.
 * Agreeing is stored on the device (services/monitoring/consent.ts).
 */
export function AiConsent({ onAgree }: { onAgree: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.flex}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <AssistantAvatar size={52} />
          <Text variant="title2" align="center">
            Your pregnancy assistant
          </Text>
          <Text variant="callout" color="textSecondary" align="center" style={styles.heroBody}>
            Ask about symptoms, food, sleep or what comes next, any time of day.
          </Text>
        </View>

        <View>
          <SectionHeader title="Before you start" />
          <Card padded={false}>
            {POINTS.map((p, i) => (
              <View key={p.title} style={[styles.point, i < POINTS.length - 1 && styles.pointDivider]}>
                <IconTile name={p.icon} tone={p.tone} size={32} />
                <View style={styles.flex}>
                  <Text variant="calloutMedium">{p.title}</Text>
                  <Text variant="footnote" color="textSecondary">
                    {p.text}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Agree and continue" size="lg" fullWidth onPress={onAgree} />
        {LEGAL.privacyUrl ? (
          <Button
            title="Read the privacy policy"
            variant="ghost"
            fullWidth
            onPress={() => WebBrowser.openBrowserAsync(LEGAL.privacyUrl!)}
          />
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingHorizontal: GUTTER, paddingTop: SPACE.xxl, paddingBottom: SPACE.xl, gap: SPACE.xxl },
    hero: { alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.lg },
    heroBody: { maxWidth: 320 },
    point: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md, padding: SPACE.lg },
    pointDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    footer: { paddingHorizontal: GUTTER, paddingTop: SPACE.md, paddingBottom: SPACE.lg, gap: SPACE.xs },
  });
