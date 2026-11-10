import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Theme, useThemedStyles, SPACE, RADIUS } from '../../context/ThemeContext';
import { Button, ConfirmSheet, EmptyState, IconButton, Sheet, Skeleton, Text, TextField, useToast } from '../ui';
import {
  addComment,
  deleteComment,
  subscribeToComments,
  type CommunityPost,
  type PostComment,
} from '../../services/firebase/communityService';
import { PersonAvatar, timeAgo } from './shared';
import { ModerationSheets, type ModerationRequest } from './ModerationSheets';
import { hiddenKey } from './useCommunitySafety';

export interface CommunityUser {
  id: string;
  name: string;
  photo: string | null;
}

export function CommentsSheet({
  visible,
  post,
  me,
  blocked,
  hidden,
  onHide,
  onClose,
}: {
  visible: boolean;
  /** Kept set while the sheet animates closed so the content doesn't vanish. */
  post: CommunityPost | undefined;
  me: CommunityUser;
  /** Author ids the user blocked: their comments are filtered out. */
  blocked: Set<string>;
  /** Reported items (see hiddenKey) hidden from this user. */
  hidden: Set<string>;
  onHide: (key: string) => void;
  onClose: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const toast = useToast();
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [toDelete, setToDelete] = useState<PostComment | null>(null);
  const [moderation, setModeration] = useState<ModerationRequest | null>(null);
  const postId = post?.id;

  const visibleComments = useMemo(
    () =>
      comments && postId
        ? comments.filter((c) => !blocked.has(c.userId) && !hidden.has(hiddenKey.comment(postId, c.id)))
        : comments,
    [comments, blocked, hidden, postId]
  );

  const openMenu = useCallback(
    (c: PostComment) => {
      if (!postId) return;
      setModeration({
        target: { type: 'comment', postId, commentId: c.id },
        authorId: c.userId,
        authorName: c.authorName || 'Anonymous',
        isOwner: c.userId === me.id,
      });
    },
    [postId, me.id]
  );

  useEffect(() => {
    if (!visible || !postId) return;
    setComments(null);
    const unsub = subscribeToComments(postId, setComments);
    return unsub;
  }, [visible, postId]);

  // Fresh draft per post.
  useEffect(() => {
    setText('');
  }, [postId]);

  const send = async () => {
    const body = text.trim();
    if (!postId || !body || sending) return;
    setSending(true);
    try {
      await addComment(postId, me.id, me.name, me.photo, body);
      setText('');
    } catch {
      toast.show('Could not post comment', 'error');
    } finally {
      setSending(false);
    }
  };

  const count = Math.max(0, post?.commentsCount ?? comments?.length ?? 0);

  return (
    <>
      <Sheet
        visible={visible && !toDelete && !moderation}
        onClose={onClose}
        title="Comments"
        subtitle={`${count} ${count === 1 ? 'comment' : 'comments'}`}
        footer={
          <View style={styles.composer}>
            <View style={{ flex: 1 }}>
              <TextField
                placeholder="Add a comment…"
                value={text}
                onChangeText={setText}
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={send}
                blurOnSubmit={false}
                accessibilityLabel="Comment text"
              />
            </View>
            <Button title="Send" loading={sending} disabled={!text.trim()} onPress={send} />
          </View>
        }
      >
        {post ? (
          <View style={styles.original}>
            <Text variant="caption" color="textMuted">
              {post.authorName || 'Anonymous'} · {timeAgo(post.createdAt)}
            </Text>
            <Text variant="callout" color="textSecondary" numberOfLines={3}>
              {post.content}
            </Text>
          </View>
        ) : null}

        {visibleComments === null ? (
          <View style={{ gap: SPACE.md }}>
            {[0, 1].map((i) => (
              <View key={i} style={styles.comment}>
                <Skeleton width={32} height={32} radius={16} />
                <View style={{ flex: 1, gap: SPACE.xs }}>
                  <Skeleton width="40%" height={12} />
                  <Skeleton width="85%" height={12} />
                </View>
              </View>
            ))}
          </View>
        ) : visibleComments.length === 0 ? (
          <EmptyState icon="chatbubble-ellipses-outline" title="No comments yet" body="Be the first to reply." />
        ) : (
          <View style={{ gap: SPACE.md }}>
            {visibleComments.map((c) => (
              <View key={c.id} style={styles.comment}>
                <PersonAvatar photo={c.authorPhoto} name={c.authorName} size={32} />
                <View style={styles.bubble}>
                  <View style={styles.bubbleHeader}>
                    <Text variant="calloutMedium" numberOfLines={1} style={{ flexShrink: 1 }}>
                      {c.authorName || 'Anonymous'}
                    </Text>
                    <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
                      {timeAgo(c.createdAt)}
                    </Text>
                    <IconButton
                      name="ellipsis-horizontal-outline"
                      variant="plain"
                      size={24}
                      iconSize={16}
                      color="textMuted"
                      onPress={() => openMenu(c)}
                      accessibilityLabel={`More options for ${c.authorName || 'Anonymous'}'s comment`}
                    />
                  </View>
                  <Text variant="callout">{c.content}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Sheet>

      <ModerationSheets
        request={moderation}
        userId={me.id}
        onDone={() => setModeration(null)}
        onDelete={(req) => {
          if (req.target.type !== 'comment') return;
          const id = req.target.commentId;
          const c = comments?.find((x) => x.id === id);
          if (c) setToDelete(c);
        }}
        onReported={(target) => {
          if (target.type === 'comment') onHide(hiddenKey.comment(target.postId, target.commentId));
        }}
      />

      <ConfirmSheet
        visible={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete this comment?"
        body="It will be removed for everyone."
        onConfirm={async () => {
          if (!toDelete || !postId) return;
          try {
            await deleteComment(postId, toDelete.id);
            toast.show('Comment deleted');
          } catch {
            toast.show('Could not delete comment', 'error');
          }
        }}
      />
    </>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    original: {
      gap: SPACE.xs,
      padding: SPACE.md,
      borderRadius: RADIUS.md,
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: colors.border,
    },
    comment: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm },
    bubble: {
      flex: 1,
      gap: 2,
      paddingHorizontal: SPACE.md,
      paddingVertical: SPACE.sm,
      borderRadius: RADIUS.md,
      backgroundColor: colors.surfaceSecondary,
    },
    bubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, minHeight: 24 },
    composer: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  });
