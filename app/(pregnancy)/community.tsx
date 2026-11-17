import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, ListRenderItem, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { usePregnancy } from '../../context/PregnancyContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { Theme, useThemedStyles, SPACE, GUTTER } from '../../context/ThemeContext';
import PremiumGate from '../../components/PremiumGate';
import {
  Button,
  Card,
  ConfirmSheet,
  EmptyState,
  HeaderAction,
  IconButton,
  Screen,
  Skeleton,
  Text,
  TextField,
  useToast,
} from '../../components/ui';
import { PostCard } from '../../components/community/PostCard';
import { CommentsSheet } from '../../components/community/CommentsSheet';
import { ComposeSheet } from '../../components/community/ComposeSheet';
import { ModerationSheets, type ModerationRequest } from '../../components/community/ModerationSheets';
import type { ModerationAction } from '../../components/community/MoreMenuButton';
import { hiddenKey, useCommunitySafety } from '../../components/community/useCommunitySafety';
import {
  CommunityPost,
  createPost,
  deletePost,
  getUserLikedPosts,
  subscribeToPosts,
  toggleLike,
} from '../../services/firebase/communityService';

const keyExtractor = (p: CommunityPost) => p.id;

export default function CommunityScreen() {
  const { user, userProfile } = useAuth();
  const { isPremium } = useSubscription();
  const { pregnancy, getCurrentWeek } = usePregnancy();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<CommunityPost | null>(null);
  const [moderation, setModeration] = useState<ModerationRequest | null>(null);

  const currentUserId = user?.uid ?? '';
  const currentUserName = userProfile?.name ?? user?.displayName ?? 'Anonymous';
  const currentUserPhoto = userProfile?.picture ?? user?.photoURL ?? null;
  const me = useMemo(
    () => ({ id: currentUserId, name: currentUserName, photo: currentUserPhoto }),
    [currentUserId, currentUserName, currentUserPhoto]
  );
  const week = pregnancy ? getCurrentWeek() : 0;
  const { blocked, hidden, hide } = useCommunitySafety(currentUserId, isPremium);

  // Read the latest like set inside a stable handler (keeps PostCard memo intact).
  const likedRef = useRef(likedPosts);
  likedRef.current = likedPosts;

  // Real-time feed + the user's like status for the posts in it.
  useEffect(() => {
    if (!isPremium) return;
    let active = true;
    const unsub = subscribeToPosts((fetched) => {
      if (!active) return;
      setPosts(fetched);
      setLoading(false);
      if (currentUserId && fetched.length > 0) {
        getUserLikedPosts(currentUserId, fetched.map((p) => p.id))
          .then((set) => active && setLikedPosts(set))
          .catch(() => {});
      }
    });
    return () => {
      active = false;
      unsub();
    };
  }, [currentUserId, isPremium]);

  // Blocked authors and posts this user reported never reach the feed.
  const visiblePosts = useMemo(
    () => posts.filter((p) => !blocked.has(p.userId) && !hidden.has(hiddenKey.post(p.id))),
    [posts, blocked, hidden]
  );

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visiblePosts;
    return visiblePosts.filter(
      (p) => p.content?.toLowerCase().includes(q) || p.authorName?.toLowerCase().includes(q)
    );
  }, [visiblePosts, search]);

  const commentPost = useMemo(
    () => (commentPostId ? visiblePosts.find((p) => p.id === commentPostId) : undefined),
    [visiblePosts, commentPostId]
  );

  // Close comments if the post disappears (deleted elsewhere).
  useEffect(() => {
    if (commentsOpen && commentPostId && !loading && !commentPost) setCommentsOpen(false);
  }, [commentsOpen, commentPostId, commentPost, loading]);

  const handleLike = useCallback(
    async (postId: string) => {
      if (!currentUserId) return;
      const wasLiked = likedRef.current.has(postId);
      const apply = (liked: boolean, delta: number) => {
        setLikedPosts((prev) => {
          const next = new Set(prev);
          if (liked) next.add(postId);
          else next.delete(postId);
          return next;
        });
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, likesCount: Math.max(0, p.likesCount + delta) } : p))
        );
      };

      apply(!wasLiked, wasLiked ? -1 : 1); // optimistic
      try {
        await toggleLike(postId, currentUserId);
      } catch {
        apply(wasLiked, wasLiked ? 1 : -1); // revert
        toast.show('Could not update like', 'error');
      }
    },
    [currentUserId, toast]
  );

  const openComments = useCallback((postId: string) => {
    setCommentPostId(postId);
    setCommentsOpen(true);
  }, []);

  const closeComments = useCallback(() => setCommentsOpen(false), []);

  const openPostMenu = useCallback(
    (post: CommunityPost, action?: ModerationAction) =>
      setModeration({
        target: { type: 'post', postId: post.id },
        authorId: post.userId,
        authorName: post.authorName || 'Anonymous',
        isOwner: post.userId === currentUserId,
        action,
      }),
    [currentUserId]
  );

  const handleCreatePost = useCallback(
    async (content: string, tagWeek?: number) => {
      try {
        await createPost(currentUserId, currentUserName, currentUserPhoto, content, tagWeek);
        setComposeOpen(false);
        toast.show('Posted');
      } catch (e) {
        toast.show('Could not create post', 'error');
        throw e;
      }
    },
    [currentUserId, currentUserName, currentUserPhoto, toast]
  );

  const renderPost = useCallback<ListRenderItem<CommunityPost>>(
    ({ item }) => (
      <PostCard
        post={item}
        liked={likedPosts.has(item.id)}
        isOwner={item.userId === currentUserId}
        onLike={handleLike}
        onComment={openComments}
        onMore={openPostMenu}
      />
    ),
    [likedPosts, currentUserId, handleLike, openComments, openPostMenu]
  );

  if (!isPremium) {
    return (
      <PremiumGate
        title="Community"
        description="Post updates and comment with other expecting parents with Plus."
        icon="people"
        preview="community"
      >
        {null}
      </PremiumGate>
    );
  }

  const searching = search.trim().length > 0;

  const listHeader = (
    <View style={styles.listHeader}>
      <TextField
        icon="search-outline"
        placeholder="Search posts or people"
        value={search}
        onChangeText={setSearch}
        clearButtonMode="while-editing"
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel="Search posts"
      />
      {searching && !loading ? (
        <Text variant="footnote" color="textMuted">
          {filteredPosts.length} {filteredPosts.length === 1 ? 'result' : 'results'} for “{search.trim()}”
        </Text>
      ) : null}
    </View>
  );

  const listEmpty = loading ? (
    <View style={{ gap: SPACE.md }}>
      {[0, 1, 2].map((i) => (
        <Card key={i} style={{ gap: SPACE.md }}>
          <View style={styles.skeletonHeader}>
            <Skeleton width={38} height={38} radius={19} />
            <View style={{ flex: 1, gap: SPACE.xs }}>
              <Skeleton width="45%" height={13} />
              <Skeleton width="25%" height={11} />
            </View>
          </View>
          <Skeleton width="95%" height={13} />
          <Skeleton width="70%" height={13} />
        </Card>
      ))}
    </View>
  ) : (
    <Card>
      {searching ? (
        <EmptyState icon="search-outline" title="No posts found" body="Try a different word or name." />
      ) : (
        <EmptyState
          icon="chatbubbles-outline"
          title="Be the first to share"
          body="Ask a question or share how this week is going — other parents are here to help."
          action={<Button title="Write a post" icon="create-outline" onPress={() => setComposeOpen(true)} />}
        />
      )}
    </Card>
  );

  return (
    <Screen
      scroll={false}
      header={{
        variant: 'bar',
        title: 'Community',
        right: <HeaderAction name="create-outline" onPress={() => setComposeOpen(true)} accessibilityLabel="New post" />,
      }}
    >
      <FlatList
        data={loading ? [] : filteredPosts}
        keyExtractor={keyExtractor}
        renderItem={renderPost}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + SPACE.xxxl }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={11}
      />

      <ComposeSheet
        visible={composeOpen}
        pregnancyWeek={week > 0 ? week : undefined}
        onClose={() => setComposeOpen(false)}
        onSubmit={handleCreatePost}
      />

      <CommentsSheet
        visible={commentsOpen}
        post={commentPost}
        me={me}
        blocked={blocked}
        hidden={hidden}
        onHide={hide}
        onClose={closeComments}
      />

      <ModerationSheets
        request={moderation}
        userId={currentUserId}
        onDone={() => setModeration(null)}
        onDelete={(req) => {
          const post = posts.find((p) => p.id === req.target.postId);
          if (post) setPostToDelete(post);
        }}
        onReported={(target) => {
          if (target.type === 'post') hide(hiddenKey.post(target.postId));
        }}
      />

      <ConfirmSheet
        visible={!!postToDelete}
        onClose={() => setPostToDelete(null)}
        title="Delete this post?"
        body="It will be removed from the community for everyone."
        onConfirm={async () => {
          if (!postToDelete) return;
          try {
            await deletePost(postToDelete.id);
            toast.show('Post deleted');
          } catch {
            toast.show('Could not delete post', 'error');
          }
        }}
      />
    </Screen>
  );
}

function Separator() {
  return <View style={{ height: SPACE.md }} />;
}

const makeStyles = (_: Theme) =>
  StyleSheet.create({
    listContent: { paddingHorizontal: GUTTER, paddingTop: SPACE.lg },
    listHeader: { gap: SPACE.sm, marginBottom: SPACE.lg },
    skeletonHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  });
