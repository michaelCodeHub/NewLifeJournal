import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  SafeAreaView,
  Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import {
  CommunityPost,
  PostComment,
  createPost,
  subscribeToPosts,
  deletePost,
  toggleLike,
  getUserLikedPosts,
  addComment,
  subscribeToComments,
  deleteComment,
} from '../../services/firebase/communityService';

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(ts: any): string {
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ photo, name, size = 40 }: { photo: string | null; name: string; size?: number }) {
  if (photo) {
    return (
      <Image
        source={{ uri: photo }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#ccc' }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#81bec1',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: size * 0.35 }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

interface PostCardProps {
  post: CommunityPost;
  liked: boolean;
  currentUserId: string;
  onLike: (postId: string) => void;
  onComment: (post: CommunityPost) => void;
  onDelete: (postId: string) => void;
}

function PostCard({ post, liked, currentUserId, onLike, onComment, onDelete }: PostCardProps) {
  const isOwner = post.userId === currentUserId;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Avatar photo={post.authorPhoto} name={post.authorName} />
        <View style={styles.cardHeaderText}>
          <Text style={styles.authorName}>{post.authorName}</Text>
          <View style={styles.metaRow}>
            {post.pregnancyWeek !== undefined && (
              <View style={styles.weekBadge}>
                <Text style={styles.weekBadgeText}>Week {post.pregnancyWeek}</Text>
              </View>
            )}
            <Text style={styles.timeAgo}>{timeAgo(post.createdAt)}</Text>
          </View>
        </View>
        {isOwner && (
          <TouchableOpacity
            onPress={() =>
              Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => onDelete(post.id) },
              ])
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.cardContent}>{post.content}</Text>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => onLike(post.id)}>
          <Text style={styles.actionIcon}>{liked ? '❤️' : '🤍'}</Text>
          <Text style={[styles.actionCount, liked && styles.actionCountLiked]}>
            {post.likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => onComment(post)}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>{Math.max(0, post.commentsCount)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Comments Modal ───────────────────────────────────────────────────────────

interface CommentsModalProps {
  post: CommunityPost | null;
  visible: boolean;
  currentUserId: string;
  currentUserName: string;
  currentUserPhoto: string | null;
  onClose: () => void;
}

function CommentsModal({
  post,
  visible,
  currentUserId,
  currentUserName,
  currentUserPhoto,
  onClose,
}: CommentsModalProps) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (!visible || !post) return;

    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();

    const unsub = subscribeToComments(post.id, setComments);
    return () => {
      unsub();
      slideAnim.setValue(600);
    };
  }, [visible, post?.id]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 600,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const handleSubmit = async () => {
    if (!post || !commentText.trim()) return;
    setSubmitting(true);
    try {
      await addComment(post.id, currentUserId, currentUserName, currentUserPhoto, commentText.trim());
      setCommentText('');
    } catch (e) {
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (!post) return;
    Alert.alert('Delete Comment', 'Delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(post.id, commentId);
          } catch {
            Alert.alert('Error', 'Failed to delete comment');
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} />
        <Animated.View
          style={[styles.commentsSheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                Comments ({Math.max(0, post?.commentsCount ?? 0)})
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {comments.length === 0 ? (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsText}>No comments yet. Be the first!</Text>
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <Avatar photo={item.authorPhoto} name={item.authorName} size={32} />
                    <View style={styles.commentBubble}>
                      <View style={styles.commentBubbleHeader}>
                        <Text style={styles.commentAuthor}>{item.authorName}</Text>
                        <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
                        {item.userId === currentUserId && (
                          <TouchableOpacity onPress={() => handleDeleteComment(item.id)}>
                            <Text style={styles.commentDeleteIcon}>🗑️</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={styles.commentContent}>{item.content}</Text>
                    </View>
                  </View>
                )}
              />
            )}

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
              <View style={styles.commentInputRow}>
                <Avatar photo={currentUserPhoto} name={currentUserName} size={32} />
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment..."
                  placeholderTextColor="#aaa"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.commentSendBtn, !commentText.trim() && { opacity: 0.4 }]}
                  onPress={handleSubmit}
                  disabled={!commentText.trim() || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.commentSendText}>Send</Text>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Create Post Modal ────────────────────────────────────────────────────────

interface CreatePostModalProps {
  visible: boolean;
  pregnancyWeek?: number;
  onClose: () => void;
  onSubmit: (content: string, week?: number) => Promise<void>;
}

function CreatePostModal({ visible, pregnancyWeek, onClose, onSubmit }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [includeWeek, setIncludeWeek] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(400);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setContent('');
      setIncludeWeek(false);
      onClose();
    });
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(content.trim(), includeWeek ? pregnancyWeek : undefined);
      setContent('');
      setIncludeWeek(false);
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View
            style={[styles.createSheet, { transform: [{ translateY: slideAnim }] }]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Share Your Experience</Text>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.postTextInput}
              placeholder="What's on your mind? Share your pregnancy journey..."
              placeholderTextColor="#aaa"
              value={content}
              onChangeText={setContent}
              multiline
              autoFocus
              maxLength={1000}
              textAlignVertical="top"
            />

            <Text style={styles.charCount}>{content.length}/1000</Text>

            {pregnancyWeek !== undefined && (
              <TouchableOpacity
                style={styles.weekToggle}
                onPress={() => setIncludeWeek(!includeWeek)}
              >
                <View style={[styles.checkbox, includeWeek && styles.checkboxChecked]}>
                  {includeWeek && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={styles.weekToggleText}>
                  Tag Week {pregnancyWeek} of pregnancy
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, (!content.trim() || submitting) && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={!content.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Post</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CommunityScreen() {
  const { user, userProfile } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [commentPost, setCommentPost] = useState<CommunityPost | null>(null);

  const currentUserId = user?.uid ?? '';
  const currentUserName = userProfile?.name ?? user?.displayName ?? 'Anonymous';
  const currentUserPhoto = userProfile?.picture ?? user?.photoURL ?? null;

  // Subscribe to posts in real-time
  useEffect(() => {
    const unsub = subscribeToPosts((fetchedPosts) => {
      setPosts(fetchedPosts);
      setLoading(false);

      // Fetch like statuses for all posts
      if (currentUserId && fetchedPosts.length > 0) {
        getUserLikedPosts(currentUserId, fetchedPosts.map((p) => p.id)).then(setLikedPosts);
      }
    });
    return unsub;
  }, [currentUserId]);

  // Filter posts by search query
  const filteredPosts = posts.filter((post) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      post.content.toLowerCase().includes(q) ||
      post.authorName.toLowerCase().includes(q)
    );
  });

  const handleLike = useCallback(
    async (postId: string) => {
      if (!currentUserId) return;
      const wasLiked = likedPosts.has(postId);

      // Optimistic update
      setLikedPosts((prev) => {
        const next = new Set(prev);
        wasLiked ? next.delete(postId) : next.add(postId);
        return next;
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, likesCount: Math.max(0, p.likesCount + (wasLiked ? -1 : 1)) }
            : p
        )
      );

      try {
        await toggleLike(postId, currentUserId);
      } catch {
        // Revert on error
        setLikedPosts((prev) => {
          const next = new Set(prev);
          wasLiked ? next.add(postId) : next.delete(postId);
          return next;
        });
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, likesCount: Math.max(0, p.likesCount + (wasLiked ? 1 : -1)) }
              : p
          )
        );
      }
    },
    [currentUserId, likedPosts]
  );

  const handleDelete = useCallback(
    async (postId: string) => {
      try {
        await deletePost(postId);
      } catch {
        Alert.alert('Error', 'Failed to delete post');
      }
    },
    []
  );

  const handleCreatePost = useCallback(
    async (content: string, week?: number) => {
      await createPost(currentUserId, currentUserName, currentUserPhoto, content, week);
    },
    [currentUserId, currentUserName, currentUserPhoto]
  );

  const renderPost = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <PostCard
        post={item}
        liked={likedPosts.has(item.id)}
        currentUserId={currentUserId}
        onLike={handleLike}
        onComment={setCommentPost}
        onDelete={handleDelete}
      />
    ),
    [likedPosts, currentUserId, handleLike, handleDelete]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Community</Text>
            <Text style={styles.headerSubtitle}>Share & support each other</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search posts or authors..."
            placeholderTextColor="#aaa"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Post Count */}
        {searchQuery.trim() !== '' && (
          <Text style={styles.resultCount}>
            {filteredPosts.length} result{filteredPosts.length !== 1 ? 's' : ''} for "{searchQuery}"
          </Text>
        )}

        {/* Feed */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#81bec1" />
          </View>
        ) : filteredPosts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🌸</Text>
            <Text style={styles.emptyTitle}>
              {searchQuery.trim() ? 'No posts found' : 'Be the first to share!'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim()
                ? 'Try a different search term'
                : 'Share your pregnancy journey with the community'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredPosts}
            keyExtractor={(item) => item.id}
            renderItem={renderPost}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* FAB */}
        <TouchableOpacity style={styles.fab} onPress={() => setShowCreatePost(true)}>
          <Text style={styles.fabIcon}>✏️</Text>
        </TouchableOpacity>

        {/* Modals */}
        <CreatePostModal
          visible={showCreatePost}
          onClose={() => setShowCreatePost(false)}
          onSubmit={handleCreatePost}
        />

        <CommentsModal
          post={commentPost}
          visible={commentPost !== null}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserPhoto={currentUserPhoto}
          onClose={() => setCommentPost(null)}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E0F2F3',
  },
  container: {
    flex: 1,
    backgroundColor: '#E0F2F3',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a1a',
    padding: 0,
  },
  clearBtn: {
    paddingLeft: 8,
  },
  clearBtnText: {
    color: '#999',
    fontSize: 14,
  },
  resultCount: {
    fontSize: 13,
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 4,
  },

  // List
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 10,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 8,
  },
  weekBadge: {
    backgroundColor: '#E0F2F3',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  weekBadgeText: {
    fontSize: 11,
    color: '#3a9ea2',
    fontWeight: '600',
  },
  timeAgo: {
    fontSize: 12,
    color: '#aaa',
  },
  deleteIcon: {
    fontSize: 16,
    opacity: 0.5,
  },
  cardContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  actionCountLiked: {
    color: '#e05a8a',
  },

  // Empty / Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#81bec1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 22,
  },

  // Modal overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },

  // Create Post Sheet
  createSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 12,
    minHeight: 320,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeBtn: {
    fontSize: 16,
    color: '#999',
    padding: 4,
  },
  postTextInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1a1a1a',
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 22,
    marginBottom: 4,
  },
  charCount: {
    fontSize: 12,
    color: '#bbb',
    textAlign: 'right',
    marginBottom: 12,
  },
  weekToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#81bec1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#81bec1',
  },
  checkMark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  weekToggleText: {
    fontSize: 14,
    color: '#444',
  },
  submitBtn: {
    backgroundColor: '#81bec1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Comments Sheet
  commentsSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: 400,
    flex: 0,
  },
  emptyComments: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCommentsText: {
    color: '#aaa',
    fontSize: 14,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 10,
  },
  commentBubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  commentTime: {
    fontSize: 11,
    color: '#bbb',
    flex: 1,
  },
  commentDeleteIcon: {
    fontSize: 12,
    opacity: 0.5,
  },
  commentContent: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1a1a1a',
    maxHeight: 100,
  },
  commentSendBtn: {
    backgroundColor: '#81bec1',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  commentSendText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
