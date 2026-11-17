import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Icon, IconName } from '../../components/ui/Icon';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscription } from '../../context/SubscriptionContext';
import { Theme, useTheme, useThemedStyles, GUTTER, RADIUS, SPACE } from '../../context/ThemeContext';
import { FREE_AI_MESSAGE_LIMIT } from '../../types/subscription';
import { Button, Card, IconButton, IconTile, ListRow, Pill, PressableScale, Screen, SectionHeader, Text, useToast } from '../../components/ui';
import { FooterBar } from '../../components/insights/FooterBar';
import * as WebBrowser from 'expo-web-browser';
import { LEGAL } from '../../constants/legal';

/* ------------------------------------------------------------ comparison */

type Cell = boolean | string;

const FEATURES: { title: string; free: Cell; plus: Cell }[] = [
  { title: 'Journal & visits', free: true, plus: true },
  { title: 'Kicks & contractions', free: true, plus: true },
  { title: 'AI assistant', free: `${FREE_AI_MESSAGE_LIMIT}/mo`, plus: 'Unlimited' },
  { title: 'Health charts', free: false, plus: true },
  { title: 'PDF report', free: false, plus: true },
  { title: 'Birth plan builder', free: false, plus: true },
  { title: 'Share timeline', free: false, plus: true },
  { title: 'Community', free: false, plus: true },
];

const COL = 60;

/* ----------------------------------------------------------------- plans */

interface Plan {
  pkg: any;
  id: string;
  title: string;
  price: string;
  period: string;
  note?: string;
  badge?: string;
}

const PERIOD: Record<string, { title: string; period: string; months: number }> = {
  ANNUAL: { title: 'Yearly', period: '/ year', months: 12 },
  SIX_MONTH: { title: '6 months', period: '/ 6 months', months: 6 },
  THREE_MONTH: { title: '3 months', period: '/ 3 months', months: 3 },
  TWO_MONTH: { title: '2 months', period: '/ 2 months', months: 2 },
  MONTHLY: { title: 'Monthly', period: '/ month', months: 1 },
  WEEKLY: { title: 'Weekly', period: '/ week', months: 0 },
  LIFETIME: { title: 'Lifetime', period: 'one-time', months: 0 },
};

const ORDER = ['ANNUAL', 'SIX_MONTH', 'THREE_MONTH', 'TWO_MONTH', 'MONTHLY', 'WEEKLY', 'LIFETIME'];

function toPlans(packages: any[]): Plan[] {
  const monthly = packages.find((p) => p?.packageType === 'MONTHLY');
  const monthlyPrice: number | undefined = monthly?.product?.price;
  return [...packages]
    .sort((a, b) => {
      const ia = ORDER.indexOf(a?.packageType);
      const ib = ORDER.indexOf(b?.packageType);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    })
    .map((pkg, index) => {
      const meta = PERIOD[pkg?.packageType];
      const product = pkg?.product ?? {};
      const price: number | undefined = product.price;
      let badge: string | undefined;
      let note: string | undefined;
      if (meta && meta.months > 1 && typeof price === 'number' && typeof monthlyPrice === 'number' && monthlyPrice > 0) {
        const save = Math.round((1 - price / (monthlyPrice * meta.months)) * 100);
        if (save >= 5) badge = `Save ${save}%`;
      }
      if (meta?.months === 12 && product.pricePerMonthString) note = `${product.pricePerMonthString} / month`;
      if (product.introPrice?.priceString && product.introPrice.price === 0) note = 'Free trial included';
      return {
        pkg,
        id: String(pkg?.identifier ?? product.identifier ?? `plan-${index}`),
        title: meta?.title ?? product.title ?? pkg?.identifier ?? 'Plus',
        price: product.priceString ?? '',
        period: meta?.period ?? '',
        note,
        badge,
      };
    });
}

/* ---------------------------------------------------------------- screen */

export default function PaywallScreen() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { isPremium, offerings, purchase, restore } = useSubscription();
  const [busy, setBusy] = useState<'purchase' | 'restore' | null>(null);

  const plans = useMemo(() => toPlans(offerings?.availablePackages ?? []), [offerings]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!plans.length) return;
    setSelectedId((cur) => (cur && plans.some((p) => p.id === cur) ? cur : plans[0].id));
  }, [plans]);

  const selected = plans.find((p) => p.id === selectedId) ?? plans[0];

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(pregnancy)/(tabs)/home');
  }, [router]);

  const handlePurchase = useCallback(async () => {
    if (!selected) return;
    setBusy('purchase');
    try {
      await purchase(selected.pkg);
      toast.show('Welcome to Plus — enjoy the full app');
      close();
    } catch (err: any) {
      // Backing out of the store sheet isn't an error worth shouting about.
      if (!err?.userCancelled) toast.show(err?.message || 'Purchase failed — please try again', 'error');
    } finally {
      setBusy(null);
    }
  }, [selected, purchase, toast, close]);

  const handleRestore = useCallback(async () => {
    setBusy('restore');
    try {
      await restore();
      toast.show('Your purchases have been restored');
    } catch (err: any) {
      toast.show(err?.message || 'Restore failed — please try again', 'error');
    } finally {
      setBusy(null);
    }
  }, [restore, toast]);

  const store = Platform.OS === 'ios' ? 'Apple ID' : Platform.OS === 'android' ? 'Google Play account' : 'store account';

  const footer = isPremium ? (
    <FooterBar>
      <Button title="Done" size="lg" fullWidth onPress={close} />
    </FooterBar>
  ) : (
    <FooterBar>
      <Button
        title={selected ? `Continue with ${selected.title}` : 'Plans unavailable'}
        icon="sparkles"
        size="lg"
        fullWidth
        disabled={!selected || busy !== null}
        loading={busy === 'purchase'}
        onPress={handlePurchase}
      />
      <Button
        title="Restore purchases"
        variant="ghost"
        size="sm"
        fullWidth
        disabled={busy !== null}
        loading={busy === 'restore'}
        onPress={handleRestore}
      />
    </FooterBar>
  );

  return (
    <Screen contentStyle={{ paddingTop: insets.top + SPACE.sm }} footer={footer}>
      <View style={styles.topBar}>
        <IconButton name="close" onPress={close} accessibilityLabel="Close" />
      </View>

      <Card tone="tinted" tint="plumTint" style={styles.hero}>
        <IconTile name="sparkles" tone="plum" size={56} />
        <View style={{ gap: SPACE.xs, alignItems: 'center' }}>
          <Text variant="title1" align="center">
            {isPremium ? 'You’re on Plus' : 'Bloom & Bump Plus'}
          </Text>
          <Text variant="callout" color="textSecondary" align="center" style={{ maxWidth: 300 }}>
            {isPremium
              ? 'Thank you for supporting Bloom & Bump. Everything is unlocked.'
              : 'Unlimited answers, health charts, your birth plan and a PDF report for your care team.'}
          </Text>
        </View>
        {isPremium ? <Pill label="Active" tone="green" icon="checkmark-circle" /> : null}
      </Card>

      {!isPremium ? (
        <View>
          <SectionHeader title="Choose your plan" />
          {plans.length > 0 ? (
            <View style={{ gap: SPACE.sm }} accessibilityRole="radiogroup">
              {plans.map((p) => (
                <PlanCard key={p.id} plan={p} selected={p.id === selected?.id} onSelect={setSelectedId} />
              ))}
            </View>
          ) : (
            <Card style={styles.noPlans}>
              <IconTile name="cloud-offline-outline" tone="neutral" size={36} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyMedium">Plans aren’t available yet</Text>
                <Text variant="footnote" color="textSecondary">
                  {__DEV__
                    ? 'RevenueCat/store products haven’t been configured for this build. See MONETIZATION_PLAN.md for setup steps.'
                    : 'Please check your connection and try again in a moment.'}
                </Text>
              </View>
            </Card>
          )}
        </View>
      ) : null}

      <View>
        <SectionHeader title="Compare plans" />
        <Card padded={false}>
          <View style={styles.compareHead}>
            <Text variant="overline" color="textMuted" style={{ flex: 1 }}>
              Feature
            </Text>
            <Text variant="overline" color="textMuted" align="center" style={styles.col}>
              Free
            </Text>
            <Text variant="overline" color="plum" align="center" style={styles.col}>
              Plus
            </Text>
          </View>
          {FEATURES.map((f, i) => (
            <ListRow
              key={f.title}
              title={f.title}
              last={i === FEATURES.length - 1}
              right={
                <View style={styles.cells}>
                  <CompareCell value={f.free} />
                  <CompareCell value={f.plus} plus />
                </View>
              }
            />
          ))}
        </Card>
      </View>

      {!isPremium ? (
        <Text variant="caption" color="textMuted" align="center" style={styles.legal}>
          Payment is charged to your {store}. Subscriptions renew automatically unless cancelled at least 24 hours before
          the end of the period. Manage or cancel any time in your account settings.
          {LEGAL.termsUrl || LEGAL.privacyUrl ? ' See our ' : null}
          {LEGAL.termsUrl ? (
            <Text
              variant="caption"
              color="textSecondary"
              accessibilityRole="link"
              style={styles.link}
              onPress={() => WebBrowser.openBrowserAsync(LEGAL.termsUrl!)}
            >
              Terms
            </Text>
          ) : null}
          {LEGAL.termsUrl && LEGAL.privacyUrl ? ' and ' : null}
          {LEGAL.privacyUrl ? (
            <Text
              variant="caption"
              color="textSecondary"
              accessibilityRole="link"
              style={styles.link}
              onPress={() => WebBrowser.openBrowserAsync(LEGAL.privacyUrl!)}
            >
              Privacy Policy
            </Text>
          ) : null}
          {LEGAL.termsUrl || LEGAL.privacyUrl ? '.' : null}
        </Text>
      ) : null}
    </Screen>
  );
}

/* ------------------------------------------------------------ components */

const CompareCell = memo(function CompareCell({ value, plus }: { value: Cell; plus?: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.col}>
      {typeof value === 'string' ? (
        <Text variant="caption" color={plus ? 'plum' : 'textSecondary'} align="center" numberOfLines={1}>
          {value}
        </Text>
      ) : value ? (
        <Icon
          name="checkmark-circle"
          size={20}
          color={plus ? colors.plum : colors.textSecondary}
          accessibilityLabel="Included"
        />
      ) : (
        <Icon name="remove" size={18} color={colors.borderStrong} accessibilityLabel="Not included" />
      )}
    </View>
  );
});

const PlanCard = memo(function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: Plan;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <PressableScale
      haptic="selection"
      onPress={() => onSelect(plan.id)}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${plan.title}, ${plan.price} ${plan.period}`}
      style={[styles.plan, selected && styles.planSelected]}
    >
      <Icon
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={selected ? colors.plum : colors.borderStrong}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.planTitleRow}>
          <Text variant="headline">{plan.title}</Text>
          {plan.badge ? <Pill label={plan.badge} tone="plum" /> : null}
        </View>
        {plan.note ? (
          <Text variant="footnote" color="textSecondary">
            {plan.note}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="headline" tabular>
          {plan.price}
        </Text>
        {plan.period ? (
          <Text variant="caption" color="textMuted">
            {plan.period}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
});

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    topBar: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: -SPACE.md },
    hero: { alignItems: 'center', gap: SPACE.lg, paddingVertical: SPACE.xxl, paddingHorizontal: GUTTER },
    compareHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.sm,
      paddingHorizontal: SPACE.lg,
      paddingTop: SPACE.md,
      paddingBottom: SPACE.sm,
      borderBottomWidth: StyleSheet.hairlineWidth * 2,
      borderBottomColor: colors.border,
    },
    cells: { flexDirection: 'row', gap: SPACE.sm },
    col: { width: COL, alignItems: 'center', justifyContent: 'center' },
    plan: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.md,
      padding: SPACE.lg,
      borderRadius: RADIUS.lg,
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    planSelected: { borderWidth: 1.5, borderColor: colors.plum, backgroundColor: colors.plumTint },
    planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
    noPlans: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
    legal: { paddingHorizontal: SPACE.sm },
    link: { textDecorationLine: 'underline' },
  });
