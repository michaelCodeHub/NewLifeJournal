import React, { useState } from 'react';
import { View } from 'react-native';
import { SPACE } from '../../context/ThemeContext';
import { Sheet } from './Sheet';
import { Text } from './Text';
import { Icon, IconName } from './Icon';
import { Button } from './Button';
import { IconTile } from './Surfaces';

/**
 * Confirmation step for destructive actions. Use instead of Alert.alert, which
 * is a no-op on web and looks different on every platform.
 */
export function ConfirmSheet({
  visible,
  onClose,
  title,
  body,
  confirmLabel = 'Delete',
  destructive = true,
  icon,
  onConfirm,
}: {
  /** Defaults to a trash can for destructive actions. */
  icon?: IconName;
  visible: boolean;
  onClose: () => void;
  title: string;
  body?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Sheet visible={visible} onClose={busy ? () => {} : onClose} scroll={false}>
      <View style={{ alignItems: 'center', gap: SPACE.sm, paddingTop: SPACE.sm }}>
        <IconTile
          name={icon ?? (destructive ? 'trash-outline' : 'help-circle-outline')}
          tone={destructive ? 'red' : 'teal'}
          size={48}
        />
        <Text variant="title2" align="center">
          {title}
        </Text>
        {body ? (
          <Text variant="callout" color="textSecondary" align="center">
            {body}
          </Text>
        ) : null}
      </View>
      <View style={{ gap: SPACE.sm }}>
        <Button
          title={confirmLabel}
          variant={destructive ? 'danger' : 'primary'}
          size="lg"
          fullWidth
          loading={busy}
          onPress={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onClose();
            } finally {
              setBusy(false);
            }
          }}
        />
        <Button title="Cancel" variant="ghost" fullWidth onPress={onClose} disabled={busy} />
      </View>
    </Sheet>
  );
}
