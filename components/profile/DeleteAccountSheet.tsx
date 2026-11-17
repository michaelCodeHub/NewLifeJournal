import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { SPACE } from '../../context/ThemeContext';
import { Button, IconTile, Sheet, Text, TextField, useToast } from '../ui';
import { deleteMyAccount, RecentLoginRequiredError } from '../../services/firebase/accountService';

const WORD = 'DELETE';

/**
 * Account deletion (PRD F03): explains what goes, asks the person to type
 * DELETE, deletes everything on the server, then shows a confirmation screen.
 */
export function DeleteAccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const { signOut } = useAuth();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) setTyped('');
  }, [visible]);

  const ready = typed.trim().toUpperCase() === WORD;

  const remove = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      await deleteMyAccount();
      // Show the confirmation first; AuthGate leaves that screen alone while signing out.
      router.replace('/(auth)/account-deleted');
      await signOut();
    } catch (err) {
      setBusy(false);
      onClose();
      toast.show(
        err instanceof RecentLoginRequiredError ? err.message : "Couldn't delete your account. Check your connection and try again.",
        'error'
      );
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={busy ? () => {} : onClose}
      footer={
        <View style={{ gap: SPACE.sm }}>
          <Button title="Delete account" variant="danger" size="lg" fullWidth disabled={!ready} loading={busy} onPress={remove} />
          <Button title="Cancel" variant="ghost" size="lg" fullWidth disabled={busy} onPress={onClose} />
        </View>
      }
    >
      <View style={{ gap: SPACE.lg }}>
        <View style={{ alignItems: 'center', gap: SPACE.sm }}>
          <IconTile name="alert-circle-outline" tone="red" size={52} />
          <Text variant="title2" align="center">
            Delete account
          </Text>
          <Text variant="callout" color="textSecondary" align="center">
            This will permanently delete all your data, including pregnancy records, visits, symptoms, baby logs, chats, photos and
            community posts. This cannot be undone.
          </Text>
        </View>
        <TextField
          label={`Type ${WORD} to confirm`}
          placeholder={WORD}
          autoCapitalize="characters"
          autoCorrect={false}
          value={typed}
          onChangeText={setTyped}
          accessibilityLabel={`Type ${WORD} to confirm`}
        />
      </View>
    </Sheet>
  );
}
