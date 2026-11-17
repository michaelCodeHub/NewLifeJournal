import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTheme, ThemeMode, SPACE, BRAND_GRADIENT } from '../../context/ThemeContext';
import {
  Avatar,
  BrandLogo,
  Button,
  Card,
  ConfirmSheet,
  ListRow,
  Pill,
  SectionHeader,
  SegmentedControl,
  Text,
  useToast,
} from '../ui';
import { LEGAL } from '../../constants/legal';
import { setConsent, useConsent } from '../../services/monitoring/consent';
import { applyAnalyticsConsent } from '../../services/monitoring/analytics';
import { deleteMyAccount, RecentLoginRequiredError } from '../../services/firebase/accountService';
import { useIsModerator } from '../../hooks/useIsModerator';

/** Avatar, name, plan and email, plus the Plus upsell for free users. Shared by both modes' "You" tab. */
export function ProfileHeader({ displayName }: { displayName: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { colors } = useTheme();
  return (
    <>
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
    </>
  );
}

/**
 * Everything below the mode-specific part of "You": appearance, app rows
 * (plus any `appRows` the mode adds), privacy, sign out / delete, version.
 */
export function AccountSections({ appRows }: { appRows?: React.ReactNode }) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { themeMode, setThemeMode, colors } = useTheme();
  const consent = useConsent();
  const toast = useToast();
  const isModerator = useIsModerator(user?.uid);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <>
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

      {appRows || isModerator || LEGAL.supportEmail ? (
        <View>
          <SectionHeader title="App" />
          <Card padded={false}>
            {appRows}
            {isModerator ? (
              <ListRow icon="flag-outline" tone="neutral" title="Moderation" onPress={() => router.push('/(pregnancy)/moderation')} />
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
      ) : null}

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
          <ListRow icon="ban-outline" tone="neutral" title="Blocked accounts" onPress={() => router.push('/(pregnancy)/blocked')} />
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
        body="This permanently deletes your pregnancy and baby journals, chats, photos and community posts. It can't be undone."
        confirmLabel="Delete forever"
        onConfirm={async () => {
          try {
            await deleteMyAccount();
            setConfirmDelete(false);
            await signOut();
          } catch (err) {
            setConfirmDelete(false);
            toast.show(
              err instanceof RecentLoginRequiredError ? err.message : "Couldn't delete your account. Check your connection and try again.",
              'error'
            );
          }
        }}
      />
    </>
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
