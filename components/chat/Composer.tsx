import { memo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Icon, IconName } from '../ui/Icon';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Theme, useTheme, useThemedStyles, RADIUS, SPACE, GUTTER, TYPE } from '../../context/ThemeContext';
import { IconButton, PressableScale, Text } from '../ui';
import type { PickedAttachment } from '../../context/ChatbotContext';

export const MAX_ATTACHMENTS = 3;
const MAX_LENGTH = 500;

export interface ComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttach: () => void;
  onRemoveAttachment: (index: number) => void;
  attachments: PickedAttachment[];
  sending: boolean;
  canSend: boolean;
}

/* ------------------------------------------------------ AttachmentPreview */

const AttachmentPreview = memo(function AttachmentPreview({
  attachment,
  index,
  onRemove,
}: {
  attachment: PickedAttachment;
  index: number;
  onRemove: (index: number) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={styles.preview}>
      {attachment.type === 'image' ? (
        <Image source={{ uri: attachment.uri }} style={styles.previewTile} contentFit="cover" transition={200} />
      ) : (
        <View style={[styles.previewTile, styles.previewDoc]}>
          <Icon name="document-text-outline" size={20} color={colors.primaryDark} />
          <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.previewName}>
            {attachment.name}
          </Text>
        </View>
      )}
      <PressableScale
        onPress={() => onRemove(index)}
        scaleTo={0.88}
        hitSlop={10}
        accessibilityLabel={`Remove ${attachment.name}`}
        style={styles.remove}
      >
        <Icon name="close" size={12} color={colors.background} />
      </PressableScale>
    </Animated.View>
  );
});

/* --------------------------------------------------------------- Composer */

/**
 * Pinned message composer: attachment previews, an auto-growing input between
 * the attach and send buttons, and the medical disclaimer underneath.
 */
export function Composer({
  value,
  onChangeText,
  onSend,
  onAttach,
  onRemoveAttachment,
  attachments,
  sending,
  canSend,
}: ComposerProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [focused, setFocused] = useState(false);
  const nearLimit = value.length > MAX_LENGTH - 60;

  return (
    <View style={styles.root}>
      {attachments.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.previews}
          keyboardShouldPersistTaps="handled"
        >
          {attachments.map((att, i) => (
            <AttachmentPreview key={`${att.uri}-${i}`} attachment={att} index={i} onRemove={onRemoveAttachment} />
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.row}>
        <IconButton
          name="add"
          variant="filled"
          size={40}
          color="primaryDark"
          onPress={onAttach}
          disabled={sending || attachments.length >= MAX_ATTACHMENTS}
          accessibilityLabel="Add attachment"
        />
        <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder="Ask about your pregnancy…"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.primaryDark}
            multiline
            maxLength={MAX_LENGTH}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            accessibilityLabel="Message"
            style={[styles.input, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
          />
          {nearLimit ? (
            <Text variant="caption" color="textMuted" tabular style={styles.counter}>
              {MAX_LENGTH - value.length}
            </Text>
          ) : null}
        </View>
        <PressableScale
          onPress={onSend}
          disabled={!canSend}
          scaleTo={0.9}
          haptic="medium"
          accessibilityLabel="Send message"
          style={[styles.send, canSend || sending ? styles.sendActive : styles.sendIdle]}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Icon name="arrow-up" size={20} color={canSend ? colors.onPrimary : colors.textMuted} />
          )}
        </PressableScale>
      </View>

      <Text variant="caption" color="textMuted" align="center" style={styles.disclaimer}>
        Not medical advice. In an emergency, call your doctor or local emergency number.
      </Text>
    </View>
  );
}

/* ----------------------------------------------------------------- Styles */

const SEND = 36;

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background,
      borderTopWidth: StyleSheet.hairlineWidth * 2,
      borderTopColor: colors.border,
      paddingTop: SPACE.sm + 2,
      paddingBottom: SPACE.sm,
      gap: SPACE.sm,
    },
    previews: { paddingHorizontal: GUTTER, paddingTop: SPACE.xs + 2, gap: SPACE.md },
    preview: { position: 'relative' },
    previewTile: {
      width: 60,
      height: 60,
      borderRadius: RADIUS.md,
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSecondary,
    },
    previewDoc: { alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: SPACE.xs },
    previewName: { maxWidth: 52 },
    remove: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.textPrimary,
      borderWidth: 1.5,
      borderColor: colors.background,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: SPACE.sm,
      paddingHorizontal: GUTTER - SPACE.xs,
    },
    inputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      minHeight: SEND,
      borderRadius: SEND / 2,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
      paddingHorizontal: SPACE.md + 2,
    },
    inputWrapFocused: { borderColor: colors.primaryDark },
    input: {
      flex: 1,
      ...TYPE.body,
      color: colors.textPrimary,
      maxHeight: 120,
      paddingTop: Platform.OS === 'ios' ? 10 : 8,
      paddingBottom: Platform.OS === 'ios' ? 10 : 8,
      textAlignVertical: 'center',
    },
    counter: { marginLeft: SPACE.xs, marginBottom: 11 },
    send: {
      width: SEND,
      height: SEND,
      borderRadius: SEND / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendActive: { backgroundColor: colors.primaryDark },
    sendIdle: { backgroundColor: colors.surfaceTertiary },
    disclaimer: { paddingHorizontal: GUTTER },
  });
