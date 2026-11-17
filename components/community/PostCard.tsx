import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, IconName } from '../ui/Icon';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Theme, useTheme, useThemedStyles, SPACE, RADIUS } from '../../context/ThemeContext';
import { Card, Pill, PressableScale, Text } from '../ui';
import type { CommunityPost } from '../../services/firebase/communityService';
import { PersonAvatar, timeAgo } from './shared';
import { MoreMenuButton, type ModerationAction } from './MoreMenuButton';

export interface PostCardProps {
  post: CommunityPost;
  /** Per-row boolean so liking one post never re-renders the others. */
  liked: boolean;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  /** The signed-in user wrote this post (the menu offers Delete instead of Report / Block). */
  isOwner: boolean;
  /**
   * Overflow (…) menu: report / block, or delete for your own post. On iOS / Android the
   * item is picked in a native menu and passed as `action`; on web there's no action and
   * the options sheet opens.
   */
  onMore: (post: CommunityPost, action?: ModerationAction) => void;
}

function PostCardBase({ post, liked, isOwner, onLike, onComment, onMore }: PostCardProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const pop = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const like = () => {
    if (!liked) {
      pop.value = withSequence(withTiming(1.28, { duration: 110 }), withSpring(1, { damping: 9, stiffness: 260 }));
    }
    onLike(post.id);
  };

  const comments = Math.max(0, post.commentsCount ?? 0);
  const likes = Math.max(0, post.likesCount ?? 0);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <PersonAvatar photo={post.authorPhoto} name={post.authorName} size={38} />
        <View style={styles.headerText}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {post.authorName || 'Anonymous'}
          </Text>
          <View style={styles.meta}>
            {post.pregnancyWeek !== undefined && post.pregnancyWeek !== null ? (
              <Pill label={`Week ${post.pregnancyWeek}`} tone="teal" />
            ) : null}
            <Text variant="caption" color="textMuted">
              {timeAgo(post.createdAt)}
            </Text>
          </View>
        </View>
        <MoreMenuButton
          isOwner={isOwner}
          noun="post"
          authorName={post.authorName || 'Anonymous'}
          size={30}
          iconSize={20}
          onSelect={(action) => onMore(post, action)}
          accessibilityLabel={`More options for ${post.authorName || 'Anonymous'}'s post`}
        />
      </View>

      <Text variant="body">{post.content}</Text>

      <View style={styles.footer}>
        <PressableScale
          onPress={like}
          scaleTo={0.92}
          hitSlop={8}
          accessibilityLabel={liked ? `Unlike, ${likes} likes` : `Like, ${likes} likes`}
          accessibilityState={{ selected: liked }}
          style={[styles.action, liked && styles.actionLiked]}
        >
          <Animated.View style={heartStyle}>
            <Icon name={liked ? 'heart' : 'heart-outline'} size={17} color={liked ? colors.red : colors.textSecondary} />
          </Animated.View>
          {likes > 0 ? (
            <Text variant="calloutMedium" color={liked ? 'red' : 'textSecondary'} tabular>
              {likes}
            </Text>
          ) : null}
        </PressableScale>

        <PressableScale
          onPress={() => onComment(post.id)}
          scaleTo={0.92}
          hitSlop={8}
          accessibilityLabel={`Comments, ${comments}`}
          style={styles.action}
        >
          <Icon name="chatbubble-outline" size={16} color={colors.textSecondary} />
          {comments > 0 ? (
            <Text variant="calloutMedium" color="textSecondary" tabular>
              {comments}
            </Text>
          ) : null}
        </PressableScale>
      </View>
    </Card>
  );
}

/**
 * Firestore snapshots hand us fresh objects for every post on each update, so
 * compare the fields we actually render rather than object identity.
 */
export const PostCard = memo(PostCardBase, (a, b) => {
  const p = a.post;
  const q = b.post;
  return (
    a.liked === b.liked &&
    a.onLike === b.onLike &&
    a.onComment === b.onComment &&
    a.onMore === b.onMore &&
    p.id === q.id &&
    p.content === q.content &&
    p.authorName === q.authorName &&
    p.authorPhoto === q.authorPhoto &&
    p.pregnancyWeek === q.pregnancyWeek &&
    p.likesCount === q.likesCount &&
    p.commentsCount === q.commentsCount &&
    (p.createdAt?.toMillis?.() ?? 0) === (q.createdAt?.toMillis?.() ?? 0)
  );
});

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    card: { gap: SPACE.md },
    header: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
    headerText: { flex: 1, gap: 3 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.sm,
      paddingTop: SPACE.md,
      borderTopWidth: StyleSheet.hairlineWidth * 2,
      borderTopColor: colors.border,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: SPACE.md,
      height: 32,
      borderRadius: RADIUS.pill,
      backgroundColor: colors.surfaceSecondary,
    },
    actionLiked: { backgroundColor: colors.redTint },
  });
