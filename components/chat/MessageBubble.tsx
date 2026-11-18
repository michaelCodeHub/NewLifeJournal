import { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Icon, IconName } from '../ui/Icon';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SharedValue,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Theme, useTheme, useThemedStyles, RADIUS, SPACE, GUTTER } from '../../context/ThemeContext';
import { BrandTile, Text } from '../ui';
import { MarkdownText } from './MarkdownText';
import type { ChatAttachment, ChatMessage } from '../../types/chatbot';

/* ------------------------------------------------------------ Attachments */

function MessageAttachments({ attachments, mine }: { attachments: ChatAttachment[]; mine: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.attachments}>
      {attachments.map((att, i) =>
        att.type === 'image' ? (
          <Image
            key={`att-${i}`}
            source={{ uri: att.url }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            accessibilityLabel={att.name || 'Attached image'}
          />
        ) : (
          <View key={`att-${i}`} style={[styles.doc, mine ? styles.docMine : styles.docTheirs]}>
            <Icon name="document-text-outline" size={16} color={colors.primaryDark} />
            <Text variant="caption" color="primaryDark" numberOfLines={1} style={styles.docName}>
              {att.name}
            </Text>
          </View>
        )
      )}
    </View>
  );
}

/* -------------------------------------------------------- AssistantAvatar */

/** The assistant's face in the conversation: the Bloom & Bump mark, round. */
export function AssistantAvatar({ size = 28 }: { size?: number }) {
  return <BrandTile size={size} style={{ borderRadius: size / 2 }} />;
}

/* ---------------------------------------------------------- MessageBubble */

/**
 * One chat message. Memoized: a new message only renders its own bubble, not
 * the whole conversation.
 */
export const MessageBubble = memo(function MessageBubble({ message }: { message: ChatMessage }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const mine = message.role === 'user';
  const hasAttachments = !!message.attachments && message.attachments.length > 0;

  if (mine) {
    return (
      <View style={[styles.row, styles.rowMine]}>
        <View style={[styles.bubble, styles.bubbleMine]}>
          {hasAttachments ? <MessageAttachments attachments={message.attachments!} mine /> : null}
          {message.content ? (
            <Text variant="body" color="onPrimary" selectable>
              {message.content}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  // A failed reply is one quiet line under the question, not a bot bubble
  // repeating the error.
  if (message.metadata?.error) {
    return (
      <View style={[styles.errorRow, styles.errorLine]} accessibilityRole="alert">
        <Icon name="alert-circle-outline" size={14} color={colors.red} />
        <Text variant="footnote" color="red">
          Couldn’t get a reply. Try sending it again.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <AssistantAvatar />
      <View style={[styles.bubble, styles.bubbleTheirs]}>
        {hasAttachments ? <MessageAttachments attachments={message.attachments!} mine={false} /> : null}
        <MarkdownText>{message.content}</MarkdownText>
      </View>
    </View>
  );
});

/* --------------------------------------------------------- StreamingReply */

/**
 * Reveals a growing text smoothly: network chunks arrive in bursts, so instead
 * of jumping by whole chunks the shown text catches up a few characters per
 * frame (faster when it falls further behind), and never lags more than a
 * few frames.
 */
export function useSmoothReveal(target: string): string {
  // Starts from nothing so the first words type in too.
  const [shown, setShown] = useState(0);
  const shownRef = useRef(shown);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (target.length < shownRef.current) {
      // The text was replaced (a fallback restarted it): start over.
      shownRef.current = 0;
      setShown(0);
    }
    let frame: ReturnType<typeof requestAnimationFrame> | null = null;
    const step = () => {
      const goal = targetRef.current.length;
      const behind = goal - shownRef.current;
      if (behind <= 0) {
        frame = null;
        return;
      }
      // ~6 frames to catch up, at least 2 characters a frame.
      shownRef.current = Math.min(goal, shownRef.current + Math.max(2, Math.ceil(behind / 6)));
      setShown(shownRef.current);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [target]);

  return target.slice(0, Math.min(shown, target.length));
}

/**
 * The assistant's reply while it is on its way: three dots until the first
 * words arrive, then the words typing in. One row throughout, so the dots turn
 * into the reply in place, and the saved message that replaces it at the end
 * has the same layout.
 */
export function LiveReply({ text }: { text: string }) {
  const styles = useThemedStyles(makeStyles);
  const shown = useSmoothReveal(text);
  const typing = shown.length === 0;
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      style={styles.row}
      accessibilityLiveRegion="polite"
      accessibilityLabel={typing ? 'Assistant is typing' : 'Assistant is replying'}
    >
      <AssistantAvatar />
      {typing ? (
        <View style={[styles.bubble, styles.bubbleTheirs, styles.typingBubble]}>
          <Dot index={0} />
          <Dot index={1} />
          <Dot index={2} />
        </View>
      ) : (
        <View style={[styles.bubble, styles.bubbleTheirs]}>
          <MarkdownText streaming>{shown}</MarkdownText>
        </View>
      )}
    </Animated.View>
  );
}

/* -------------------------------------------------------- TypingIndicator */

const DOT_DURATION = 320;

function Dot({ index }: { index: number }) {
  const styles = useThemedStyles(makeStyles);
  const v: SharedValue<number> = useSharedValue(0);

  useEffect(() => {
    v.value = withDelay(
      index * 140,
      withRepeat(
        withSequence(
          withTiming(1, { duration: DOT_DURATION, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: DOT_DURATION, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: DOT_DURATION / 2 })
        ),
        -1,
        false
      )
    );
    return () => cancelAnimation(v);
  }, [index, v]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + 0.65 * v.value,
    transform: [{ translateY: -3 * v.value }],
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

/** "Assistant is typing" bubble with three softly bouncing dots (UI thread). */
export function TypingIndicator() {
  const styles = useThemedStyles(makeStyles);
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(120)}
      style={styles.row}
      accessibilityLabel="Assistant is typing"
      accessibilityLiveRegion="polite"
    >
      <AssistantAvatar />
      <View style={[styles.bubble, styles.bubbleTheirs, styles.typingBubble]}>
        <Dot index={0} />
        <Dot index={1} />
        <Dot index={2} />
      </View>
    </Animated.View>
  );
}

/* ----------------------------------------------------------------- Styles */

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: SPACE.sm,
      paddingHorizontal: GUTTER,
      paddingVertical: SPACE.xs,
    },
    rowMine: { justifyContent: 'flex-end' },
    bubble: {
      maxWidth: '80%',
      paddingHorizontal: SPACE.md + 2,
      paddingVertical: SPACE.sm + 2,
      borderRadius: RADIUS.lg,
      gap: SPACE.sm,
    },
    bubbleMine: {
      backgroundColor: colors.primaryDark,
      borderBottomRightRadius: RADIUS.xs,
    },
    bubbleTheirs: {
      flexShrink: 1,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: colors.border,
      borderBottomLeftRadius: RADIUS.xs,
    },
    typingBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: SPACE.md + 2,
    },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textMuted },
    errorRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
    // Sits right under the question it failed to answer.
    errorLine: { justifyContent: 'flex-end', paddingVertical: SPACE.xs },
    attachments: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs + 2 },
    image: { width: 168, height: 126, borderRadius: RADIUS.md, backgroundColor: colors.surfaceTertiary },
    doc: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.xs + 2,
      paddingHorizontal: SPACE.sm + 2,
      paddingVertical: SPACE.xs + 2,
      borderRadius: RADIUS.sm,
      maxWidth: 200,
    },
    docMine: { backgroundColor: colors.primaryLight },
    docTheirs: { backgroundColor: colors.surfaceSecondary },
    docName: { flexShrink: 1 },
  });
