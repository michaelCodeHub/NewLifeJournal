import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, SPACE } from '../../context/ThemeContext';
import {
  Avatar,
  Button,
  Card,
  ConfirmSheet,
  EmptyState,
  Screen,
  ScreenState,
  Text,
  useToast,
} from '../../components/ui';
import { shortDate } from '../../lib/journal';
import {
  subscribeToBlockedAccounts,
  unblockUser,
  type BlockedAccount,
} from '../../services/firebase/communityService';

const HEADER = { title: 'Blocked accounts', variant: 'bar' as const };

/** Profile → Privacy → Blocked accounts: everyone hidden from Community, with Unblock. */
export default function BlockedAccountsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const toast = useToast();
  const [accounts, setAccounts] = useState<BlockedAccount[] | null>(null);
  const [failed, setFailed] = useState(false);
  // Keep the last picked account while the sheet animates out, so its title doesn't blank.
  const [pending, setPending] = useState<BlockedAccount | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const uid = user?.uid;
  useEffect(() => {
    if (!uid) return;
    return subscribeToBlockedAccounts(uid, setAccounts, () => setFailed(true));
  }, [uid]);

  if (failed) {
    return (
      <Screen header={HEADER} scroll={false}>
        <ScreenState title="Couldn’t load your list" body="Check your connection and try again." icon="cloud-offline-outline" />
      </Screen>
    );
  }
  if (!accounts) {
    return (
      <Screen header={HEADER} scroll={false}>
        <ScreenState loading />
      </Screen>
    );
  }

  return (
    <Screen header={HEADER}>
      {accounts.length === 0 ? (
        <EmptyState
          icon="shield-checkmark-outline"
          title="No one is blocked"
          body="When you block someone in Community, their posts and comments are hidden from you. They’ll show up here."
        />
      ) : (
        <>
          <Text variant="footnote" color="textMuted" style={styles.intro}>
            Their posts and comments are hidden from you. They aren’t told when you block or unblock them.
          </Text>
          <Card padded={false}>
            {accounts.map((a, i) => (
              <View
                key={a.id}
                style={[
                  styles.row,
                  i < accounts.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}
              >
                <Avatar name={a.name} size={36} />
                <View style={styles.text}>
                  <Text variant="headline" numberOfLines={1}>
                    {a.name}
                  </Text>
                  {a.createdAt ? (
                    <Text variant="caption" color="textMuted">
                      Blocked {shortDate(a.createdAt.toDate())}
                    </Text>
                  ) : null}
                </View>
                <Button
                  title="Unblock"
                  size="sm"
                  variant="secondary"
                  onPress={() => {
                    setPending(a);
                    setConfirmOpen(true);
                  }}
                  accessibilityLabel={`Unblock ${a.name}`}
                />
              </View>
            ))}
          </Card>
        </>
      )}

      <ConfirmSheet
        visible={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        destructive={false}
        icon="person-add-outline"
        title={`Unblock ${pending?.name ?? ''}?`}
        body="You’ll see their posts and comments in Community again."
        confirmLabel="Unblock"
        onConfirm={async () => {
          if (!uid || !pending) return;
          try {
            await unblockUser(uid, pending.id);
            toast.show(`Unblocked ${pending.name}`);
          } catch {
            toast.show('Could not unblock', 'error');
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: SPACE.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md },
  text: { flex: 1, gap: 2 },
});
