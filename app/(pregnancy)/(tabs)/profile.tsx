import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuth } from '../../../context/AuthContext';
import { usePregnancy } from '../../../context/PregnancyContext';
import { useSubscription } from '../../../context/SubscriptionContext';
import { useTheme, ThemeMode, SPACE, BRAND_GRADIENT } from '../../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Avatar,
  BrandLogo,
  Button,
  Card,
  ConfirmSheet,
  ListRow,
  Pill,
  Screen,
  SectionHeader,
  SegmentedControl,
  Text,
  useToast,
} from '../../../components/ui';
import { longDate, trimesterLabel } from '../../../lib/journal';
import { LEGAL } from '../../../constants/legal';
import { setConsent, useConsent } from '../../../services/monitoring/consent';
import { applyAnalyticsConsent } from '../../../services/monitoring/analytics';
import { deleteMyAccount, RecentLoginRequiredError } from '../../../services/firebase/accountService';
import { useIsModerator } from '../../../hooks/useIsModerator';
import { BabyArrivedSheet } from '../../../components/BabyArrivedSheet';
import type { IconName } from '../../../components/ui/Icon';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { pregnancy, hospitalVisits, symptoms, getCurrentWeek, getDaysUntilDue, isCompleted, undoBabyArrived } = usePregnancy();
  const { isPremium } = useSubscription();
  const { themeMode, setThemeMode, colors } = useTheme();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [arrivedOpen, setArrivedOpen] = useState(false);
  const [confirmUndo, setConfirmUndo] = useState(false);
  const consent = useConsent();
  const toast = useToast();
  const isModerator = useIsModerator(user?.uid);

  const displayName = pregnancy?.motherName || user?.displayName || 'You';
  const week = getCurrentWeek();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen header={{ title: 'Profile' }}>
      {/* Instagram-style profile header */}
      <View style={[styles.profileHead, { paddingTop: SPACE.md }]}>
        <LinearGradient
          colors={BRAND_GRADIENT as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={styles.avatarRing}
        >
          <View style={[styles.avatarGap, { backgroundColor: colors.background }]}>
            <Avatar name={displayName} size={80} />
          </View>
        </LinearGradient>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <View style={styles.nameRow}>
            <Text variant="title2" numberOfLines={1}>
              {displayName}
            </Text>
            <Pill label={isPremium ? 'Plus' : 'Free'} tone={isPremium ? 'teal' : 'neutral'} />
          </View>
          {user?.email ? (
            <Text variant="footnote" color="textMuted" numberOfLines={1}>
              {user.email}
            </Text>
          ) : null}
        </View>
      </View>

      {!isPremium ? (
        <Card tone="tinted" tint="plumTint" style={styles.upsell}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="headline">Bloom & Bump Plus</Text>
            <Text variant="footnote" color="textSecondary">
              Unlimited AI answers, charts, birth plan and PDF export.
            </Text>
          </View>
          <Button title="See plans" size="sm" variant="secondary" onPress={() => router.push('/(pregnancy)/paywall')} />
        </Card>
      ) : null}

      {pregnancy ? (
        <View>
          <SectionHeader title="Pregnancy" action="Edit" onAction={() => router.push('/(pregnancy)/editpregnancy')} />
          <Card padded={false}>
            {(
              [
                isCompleted
                  ? ['baby-outline', 'Born', pregnancy.birthDate ? longDate(pregnancy.birthDate.toDate()) : `Week ${week}`]
                  : ['calendar-outline', 'Current week', `Week ${week} · ${trimesterLabel(week)}`],
                ['flag-outline', 'Due date', longDate(pregnancy.dueDate.toDate())],
                ['hourglass-outline', 'Days to go', isCompleted ? undefined : String(Math.max(0, getDaysUntilDue()))],
                ['heart-outline', 'Baby', pregnancy.babyName],
                ['person-outline', 'Doctor', pregnancy.doctorName],
                ['business-outline', 'Hospital', pregnancy.hospital],
              ] as [IconName, string, string | undefined][]
            )
              .filter(([, , value]) => !!value)
              .map(([icon, title, value], i, rows) => (
                <ListRow key={title} icon={icon} title={title} value={value} last={i === rows.length - 1} />
              ))}
          </Card>
          <Card padded={false} style={{ marginTop: SPACE.md }}>
            {isCompleted ? (
              <>
                <ListRow
                  icon="add-circle-outline"
                  title="Start a new pregnancy"
                  onPress={() => router.push('/(onboarding)/create-pregnancy')}
                />
                <ListRow icon="arrow-undo-outline" title="Undo “Baby has arrived”" chevron={false} last onPress={() => setConfirmUndo(true)} />
              </>
            ) : (
              <ListRow icon="heart-outline" tone="plum" title="Baby has arrived" last onPress={() => setArrivedOpen(true)} />
            )}
          </Card>
        </View>
      ) : null}

      <View>
        <SectionHeader title="Appearance" />
        <SegmentedControl<ThemeMode>
          value={themeMode}
          onChange={setThemeMode}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </View>

      <View>
        <SectionHeader title="App" />
        <Card padded={false}>
          <ListRow
            icon="notifications-outline"
            tone="neutral"
            title="Reminders"
            onPress={() => router.push('/(pregnancy)/notifications')}
          />
          <ListRow
            icon="download-outline"
            tone="neutral"
            title="Export my data"
            onPress={() => router.push('/(pregnancy)/export')}
          />
          {isModerator ? (
            <ListRow
              icon="flag-outline"
              tone="neutral"
              title="Moderation"
              onPress={() => router.push('/(pregnancy)/moderation')}
            />
          ) : null}
          {__DEV__ ? (
            <ListRow icon="construct-outline" tone="neutral" title="Developer tools" onPress={() => router.push('/(pregnancy)/admin')} />
          ) : null}
          {LEGAL.supportEmail ? (
            <ListRow
              icon="mail-unread-outline"
              tone="neutral"
              title="Contact support"
              onPress={() => WebBrowser.openBrowserAsync(`mailto:${LEGAL.supportEmail}`)}
              last
            />
          ) : null}
        </Card>
      </View>

      <View>
        <SectionHeader title="Privacy" />
        <Card padded={false}>
          <ListRow
            icon="analytics-outline"
            tone="neutral"
            title="Share anonymous usage"
            subtitle="Helps us improve the app. Never includes health details."
            chevron={false}
            right={
              <Switch
                value={consent.analytics}
                onValueChange={(v) => {
                  setConsent({ analytics: v });
                  applyAnalyticsConsent(v);
                }}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#FFFFFF"
                accessibilityLabel="Share anonymous usage"
              />
            }
          />
          <ListRow
            icon="ban-outline"
            tone="neutral"
            title="Blocked accounts"
            onPress={() => router.push('/(pregnancy)/blocked')}
          />
          {LEGAL.privacyUrl ? (
            <ListRow
              icon="shield-checkmark-outline"
              tone="neutral"
              title="Privacy policy"
              onPress={() => WebBrowser.openBrowserAsync(LEGAL.privacyUrl!)}
            />
          ) : null}
          {LEGAL.termsUrl ? (
            <ListRow
              icon="document-text-outline"
              tone="neutral"
              title="Terms of service"
              onPress={() => WebBrowser.openBrowserAsync(LEGAL.termsUrl!)}
            />
          ) : null}
          <ListRow icon="lock-closed-outline" tone="neutral" title="Your data" value="Never sold or shared" chevron={false} last />
        </Card>
      </View>

      <Card padded={false}>
        <ListRow icon="log-out-outline" title="Sign out" destructive chevron={false} onPress={() => setConfirmSignOut(true)} />
        <ListRow icon="trash-outline" title="Delete account" destructive chevron={false} last onPress={() => setConfirmDelete(true)} />
      </Card>

      <View style={styles.footer}>
        <BrandLogo height={52} />
        <Text variant="caption" color="textMuted">
          Version {version} · Your data stays private
        </Text>
      </View>

      <BabyArrivedSheet visible={arrivedOpen} onClose={() => setArrivedOpen(false)} />

      <ConfirmSheet
        visible={confirmUndo}
        onClose={() => setConfirmUndo(false)}
        title="Undo “Baby has arrived”?"
        body="Your pregnancy becomes active again and the week count picks up from today."
        confirmLabel="Undo"
        icon="arrow-undo-outline"
        onConfirm={async () => {
          try {
            await undoBabyArrived();
            toast.show('Pregnancy is active again');
          } catch {
            toast.show("Couldn't undo that. Try again.", 'error');
          }
        }}
      />

      <ConfirmSheet
        visible={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        title="Sign out?"
        body="Your journal stays safe in your account. Sign back in any time."
        confirmLabel="Sign out"
        icon="log-out-outline"
        onConfirm={async () => {
          await signOut();
        }}
      />

      <ConfirmSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete your account?"
        body="This permanently deletes your journal, visits, symptoms, chats, photos and community posts. It can't be undone."
        confirmLabel="Delete forever"
        onConfirm={async () => {
          try {
            await deleteMyAccount();
            setConfirmDelete(false);
            await signOut();
          } catch (err) {
            setConfirmDelete(false);
            toast.show(
              err instanceof RecentLoginRequiredError
                ? err.message
                : "Couldn't delete your account. Check your connection and try again.",
              'error'
            );
          }
        }}
      />
    </Screen>
  );
}


const styles = StyleSheet.create({
  profileHead: { alignItems: 'center', gap: SPACE.md },
  avatarRing: { padding: 3, borderRadius: 999 },
  avatarGap: { padding: 3, borderRadius: 999 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  upsell: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  footer: { alignItems: 'center', gap: SPACE.sm, paddingTop: SPACE.sm, opacity: 0.85 },
});
