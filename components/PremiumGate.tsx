import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconName } from './ui/Icon';
import { useRouter } from 'expo-router';
import { useSubscription } from '../context/SubscriptionContext';
import { GUTTER, SPACE, useTheme } from '../context/ThemeContext';
import { Button, EmptyState, IconTile, Screen, Text } from './ui';
import { PremiumPreview, PremiumPreviewKind } from './PremiumPreview';

interface PremiumGateProps {
  /** Feature name shown in the header and on the upsell card, e.g. "Health charts". */
  title: string;
  /** One or two sentences on what upgrading unlocks for this feature. */
  description: string;
  /** Feature icon, shown in the soft tile above the title. */
  icon?: IconName;
  /** Sample of the feature, shown faded above the upsell so the page isn't empty. */
  preview?: PremiumPreviewKind;
  /** Render a back-button header bar (default). Pass false when embedding inside another Screen. */
  header?: boolean;
  children: React.ReactNode;
}

/**
 * Wraps a screen's content. Renders `children` unchanged for premium users;
 * renders an upgrade prompt instead of the feature for free users.
 *
 * Usage: put this as the outermost return once all of a screen's hooks have
 * already run, e.g.:
 *
 *   if (!isPremium) {
 *     return <PremiumGate title="Health charts" description="..." preview="charts">{null}</PremiumGate>;
 *   }
 */
export default function PremiumGate({ title, description, icon = 'sparkles', preview, header = true, children }: PremiumGateProps) {
  const { isPremium } = useSubscription();
  const { colors } = useTheme();
  const router = useRouter();

  if (isPremium) return <>{children}</>;

  const openPaywall = () => router.push('/(pregnancy)/paywall');

  if (!preview) {
    const card = (
      <EmptyState
        icon={icon}
        tone="plum"
        title={title}
        body={description}
        action={<Button title="See Plus" icon="sparkles" onPress={openPaywall} />}
      />
    );
    if (!header) return card;
    return (
      <Screen header={{ variant: 'bar', title }} contentStyle={styles.centered}>
        {card}
      </Screen>
    );
  }

  // A faded sample of the real feature, dissolving into the page, with the
  // pitch underneath. The sample is decorative: no touches, hidden from screen readers.
  const body = (
    <View>
      <View
        style={styles.previewWrap}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={styles.previewInner}>
          <PremiumPreview kind={preview} />
        </View>
        <LinearGradient
          colors={[`${colors.background}00`, `${colors.background}CC`, colors.background]}
          locations={[0, 0.55, 1]}
          style={styles.fade}
        />
      </View>
      <View style={styles.pitch}>
        <IconTile name={icon} tone="plum" size={44} />
        <Text variant="title2" align="center">{title}</Text>
        <Text variant="callout" color="textSecondary" align="center" style={styles.pitchBody}>
          {description}
        </Text>
        <Button title="See Plus" icon="sparkles" fullWidth size="lg" onPress={openPaywall} />
      </View>
    </View>
  );

  if (!header) return body;
  return (
    <Screen header={{ variant: 'bar', title }} contentStyle={styles.withPreview}>
      {body}
    </Screen>
  );
}

const PREVIEW_HEIGHT = 300;

const styles = StyleSheet.create({
  centered: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: GUTTER, paddingBottom: SPACE.huge },
  withPreview: { paddingHorizontal: GUTTER, paddingTop: SPACE.md },
  previewWrap: { height: PREVIEW_HEIGHT, overflow: 'hidden' },
  previewInner: { opacity: 0.7 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: PREVIEW_HEIGHT * 0.7 },
  pitch: { alignItems: 'center', gap: SPACE.sm, marginTop: -SPACE.xxxl, paddingHorizontal: SPACE.sm },
  pitchBody: { maxWidth: 320, marginBottom: SPACE.md },
});
