import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  Animated,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChatbot, PickedAttachment } from '../../context/ChatbotContext';
import { usePregnancy } from '../../context/PregnancyContext';
import { ChatAttachment } from '../../types/chatbot';

// Lazy imports to avoid crash when native modules aren't built yet
const getImagePicker = () => require('expo-image-picker') as typeof import('expo-image-picker');
const getDocumentPicker = () => require('expo-document-picker') as typeof import('expo-document-picker');

const getQuickSuggestions = (week: number): string[] => {
  if (week <= 12) {
    return [
      'Is nausea normal at this stage?',
      'What foods should I avoid in the first trimester?',
      'When should I schedule my first ultrasound?',
    ];
  }
  if (week <= 27) {
    return [
      'What should I know about the anatomy scan?',
      'How much weight gain is normal by now?',
      'When will I start feeling kicks?',
    ];
  }
  return [
    'What should I pack in my hospital bag?',
    'How do I know if contractions are real?',
    'What are signs of labor starting?',
  ];
};

export default function ChatScreen() {
  const { messages, loading, sending, error, sendMessage, clearError } = useChatbot();
  const { pregnancy } = usePregnancy();
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<PickedAttachment[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const menuFadeAnim = useRef(new Animated.Value(0)).current;
  const menuSlideAnim = useRef(new Animated.Value(200)).current;

  const insets = useSafeAreaInsets();
  const currentWeek = pregnancy?.currentWeek || 1;
  const suggestions = getQuickSuggestions(currentWeek);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const openAttachMenu = useCallback(() => {
    setShowAttachMenu(true);
    Animated.parallel([
      Animated.timing(menuFadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(menuSlideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  const closeAttachMenu = useCallback(() => {
    Animated.parallel([
      Animated.timing(menuFadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(menuSlideAnim, { toValue: 200, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowAttachMenu(false));
  }, []);

  const pickFromGallery = useCallback(() => {
    setShowAttachMenu(false);
    setTimeout(async () => {
      try {
        const picker = getImagePicker();
        const result = await picker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          allowsMultipleSelection: true,
          selectionLimit: 3,
        });
        if (!result.canceled && result.assets.length > 0) {
          const newAttachments: PickedAttachment[] = result.assets.map((asset: any, i: number) => ({
            uri: asset.uri,
            name: asset.fileName || `photo_${Date.now()}_${i}.jpg`,
            mimeType: asset.mimeType || 'image/jpeg',
            type: 'image' as const,
          }));
          setAttachments(prev => [...prev, ...newAttachments].slice(0, 3));
        }
      } catch {
        Alert.alert('Not Available', 'Image picker requires a development build. Please rebuild the app.');
      }
    }, 500);
  }, []);

  const pickFromCamera = useCallback(() => {
    setShowAttachMenu(false);
    setTimeout(async () => {
      try {
        const picker = getImagePicker();
        const { status } = await picker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera access is required to take photos.');
          return;
        }
        const result = await picker.launchCameraAsync({
          quality: 0.7,
        });
        if (!result.canceled && result.assets.length > 0) {
          const asset = result.assets[0];
          setAttachments(prev => [...prev, {
            uri: asset.uri,
            name: asset.fileName || `camera_${Date.now()}.jpg`,
            mimeType: asset.mimeType || 'image/jpeg',
            type: 'image' as const,
          }].slice(0, 3));
        }
      } catch {
        Alert.alert('Not Available', 'Camera requires a development build. Please rebuild the app.');
      }
    }, 500);
  }, []);

  const pickDocument = useCallback(() => {
    setShowAttachMenu(false);
    setTimeout(async () => {
      try {
        const docPicker = getDocumentPicker();
        const result = await docPicker.getDocumentAsync({
          type: ['image/*', 'application/pdf'],
          multiple: true,
        });
        if (!result.canceled && result.assets.length > 0) {
          const newAttachments: PickedAttachment[] = result.assets.map((asset: any) => ({
            uri: asset.uri,
            name: asset.name,
            mimeType: asset.mimeType || 'application/octet-stream',
            type: (asset.mimeType?.startsWith('image/') ? 'image' : 'document') as 'image' | 'document',
          }));
          setAttachments(prev => [...prev, ...newAttachments].slice(0, 3));
        }
      } catch {
        Alert.alert('Not Available', 'Document picker requires a development build. Please rebuild the app.');
      }
    }, 500);
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSend = async () => {
    if ((!inputText.trim() && attachments.length === 0) || sending) return;

    const messageText = inputText.trim();
    const currentAttachments = [...attachments];
    setInputText('');
    setAttachments([]);

    await sendMessage(
      messageText || 'What do you see in this image?',
      currentAttachments.length > 0 ? currentAttachments : undefined
    );
  };

  const canSend = (inputText.trim().length > 0 || attachments.length > 0) && !sending;

  // Render attachment thumbnails in a message bubble
  const renderMessageAttachments = (messageAttachments?: ChatAttachment[]) => {
    if (!messageAttachments || messageAttachments.length === 0) return null;
    return (
      <View style={styles.messageAttachments}>
        {messageAttachments.map((att, i) => (
          att.type === 'image' ? (
            <Image
              key={`att-${i}`}
              source={{ uri: att.url }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          ) : (
            <View key={`att-${i}`} style={styles.documentBadge}>
              <Text style={styles.documentIcon}>📄</Text>
              <Text style={styles.documentName} numberOfLines={1}>{att.name}</Text>
            </View>
          )
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#81bec1" />
      </View>
    );
  }

  if (!pregnancy) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🤰</Text>
        <Text style={styles.emptyTitle}>No Pregnancy Found</Text>
        <Text style={styles.emptySubtitle}>Please create a pregnancy profile first</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerIconCircle}>
          <Text style={styles.headerIcon}>💬</Text>
        </View>
        <View>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Text style={styles.headerSubtitle}>Week {currentWeek} companion</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyAvatarCircle}>
              <Text style={styles.emptyAvatar}>🤖</Text>
            </View>
            <Text style={styles.greetingText}>
              Hi {pregnancy?.motherName || 'there'}!
            </Text>
            <Text style={styles.greetingSubtext}>
              You're in week {currentWeek} — ask me anything about your journey!
            </Text>

            {/* Quick suggestions */}
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Try asking:</Text>
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={`suggestion-${index}`}
                  style={styles.suggestionButton}
                  onPress={() => setInputText(suggestion)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                  <Text style={styles.suggestionArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          messages.map((message, index) => (
            <View
              key={message.id || `message-${index}-${message.timestamp?.toMillis()}`}
              style={[
                styles.messageBubble,
                message.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              {message.role === 'assistant' && (
                <View style={styles.assistantLabel}>
                  <Text style={styles.assistantLabelIcon}>🤖</Text>
                  <Text style={styles.assistantLabelText}>AI Assistant</Text>
                </View>
              )}
              {renderMessageAttachments(message.attachments)}
              <Text
                style={[
                  styles.messageText,
                  message.role === 'user' ? styles.userText : styles.assistantText,
                ]}
              >
                {message.content}
              </Text>
              {message.metadata?.error && (
                <Text style={styles.errorIndicator}>⚠️ Error occurred</Text>
              )}
            </View>
          ))
        )}

        {sending && (
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <View style={styles.assistantLabel}>
              <Text style={styles.assistantLabelIcon}>🤖</Text>
              <Text style={styles.assistantLabelText}>AI Assistant</Text>
            </View>
            <View style={styles.typingRow}>
              <View style={[styles.typingDot, styles.typingDot1]} />
              <View style={[styles.typingDot, styles.typingDot2]} />
              <View style={[styles.typingDot, styles.typingDot3]} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Text style={styles.errorDismiss}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Attachment Preview */}
      {attachments.length > 0 && (
        <View style={styles.attachmentPreviewRow}>
          {attachments.map((att, index) => (
            <View key={`preview-${index}`} style={styles.attachmentPreview}>
              {att.type === 'image' ? (
                <Image source={{ uri: att.uri }} style={styles.previewImage} />
              ) : (
                <View style={styles.previewDocument}>
                  <Text style={styles.previewDocIcon}>📄</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.removeAttachment}
                onPress={() => removeAttachment(index)}
              >
                <Text style={styles.removeAttachmentText}>✕</Text>
              </TouchableOpacity>
              {att.type === 'document' && (
                <Text style={styles.previewFileName} numberOfLines={1}>{att.name}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={openAttachMenu}
            disabled={sending}
            activeOpacity={0.6}
          >
            <Text style={styles.attachButtonText}>+</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about your pregnancy..."
            placeholderTextColor="#9CB8BA"
            multiline
            maxLength={500}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>↑</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Attachment Menu Modal */}
      <Modal visible={showAttachMenu} transparent animationType="none">
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={closeAttachMenu}
        >
          <Animated.View style={{ opacity: menuFadeAnim, flex: 1 }}>
            <View style={styles.menuBackdropFill} />
          </Animated.View>
        </TouchableOpacity>
        <Animated.View
          style={[
            styles.menuContainer,
            { transform: [{ translateY: menuSlideAnim }], paddingBottom: insets.bottom + 12 },
          ]}
        >
          <View style={styles.menuHandle} />
          <Text style={styles.menuTitle}>Add Attachment</Text>
          <TouchableOpacity style={styles.menuOption} onPress={pickFromGallery} activeOpacity={0.7}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#E8F4F5' }]}>
              <Text style={styles.menuOptionIcon}>🖼️</Text>
            </View>
            <View>
              <Text style={styles.menuOptionLabel}>Photo Library</Text>
              <Text style={styles.menuOptionDesc}>Choose from your gallery</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuOption} onPress={pickFromCamera} activeOpacity={0.7}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#FFF3E0' }]}>
              <Text style={styles.menuOptionIcon}>📷</Text>
            </View>
            <View>
              <Text style={styles.menuOptionLabel}>Take Photo</Text>
              <Text style={styles.menuOptionDesc}>Use your camera</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuOption} onPress={pickDocument} activeOpacity={0.7}>
            <View style={[styles.menuIconCircle, { backgroundColor: '#F3E5F5' }]}>
              <Text style={styles.menuOptionIcon}>📄</Text>
            </View>
            <View>
              <Text style={styles.menuOptionLabel}>Document</Text>
              <Text style={styles.menuOptionDesc}>PDF or image file</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F4F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F4F5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F4F5',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 12,
    backgroundColor: '#E8F4F5',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(129, 190, 193, 0.2)',
  },
  headerIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(129, 190, 193, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B9FA1',
    fontWeight: '500',
  },

  // Messages
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyAvatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(129, 190, 193, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyAvatar: {
    fontSize: 36,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  greetingSubtext: {
    fontSize: 14,
    color: '#6B9FA1',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  suggestionsContainer: {
    width: '100%',
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 14,
    padding: 15,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(129, 190, 193, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestionText: {
    fontSize: 14,
    color: '#4a9a9d',
    fontWeight: '500',
    flex: 1,
  },
  suggestionArrow: {
    fontSize: 20,
    color: '#81bec1',
    fontWeight: '300',
    marginLeft: 8,
  },

  // Message Bubbles
  messageBubble: {
    maxWidth: '82%',
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#81bec1',
    borderBottomRightRadius: 6,
    shadowColor: '#81bec1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(129, 190, 193, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  assistantLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  assistantLabelIcon: {
    fontSize: 12,
  },
  assistantLabelText: {
    fontSize: 11,
    color: '#81bec1',
    fontWeight: '600',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#333',
  },
  errorIndicator: {
    fontSize: 11,
    color: '#ff3b30',
    marginTop: 6,
  },

  // Message attachments
  messageAttachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  messageImage: {
    width: 160,
    height: 120,
    borderRadius: 12,
  },
  documentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(129, 190, 193, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  documentIcon: {
    fontSize: 14,
  },
  documentName: {
    fontSize: 12,
    color: '#4a9a9d',
    fontWeight: '500',
    maxWidth: 120,
  },

  // Typing indicator
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#81bec1',
    opacity: 0.4,
  },
  typingDot1: {
    opacity: 0.8,
  },
  typingDot2: {
    opacity: 0.5,
  },
  typingDot3: {
    opacity: 0.3,
  },

  // Error Banner
  errorBanner: {
    backgroundColor: '#FFF0F0',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 100, 100, 0.15)',
  },
  errorText: {
    fontSize: 13,
    color: '#c62828',
    flex: 1,
  },
  errorDismiss: {
    fontSize: 13,
    color: '#81bec1',
    fontWeight: '600',
    marginLeft: 12,
  },

  // Attachment preview
  attachmentPreviewRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  attachmentPreview: {
    position: 'relative',
    alignItems: 'center',
  },
  previewImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(129, 190, 193, 0.3)',
  },
  previewDocument: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: 'rgba(129, 190, 193, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(129, 190, 193, 0.3)',
  },
  previewDocIcon: {
    fontSize: 28,
  },
  previewFileName: {
    fontSize: 9,
    color: '#6B9FA1',
    marginTop: 2,
    maxWidth: 64,
    textAlign: 'center',
  },
  removeAttachment: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  removeAttachmentText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Input Area
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(129, 190, 193, 0.15)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(129, 190, 193, 0.25)',
    paddingLeft: 6,
    paddingRight: 6,
    paddingVertical: 6,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(129, 190, 193, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachButtonText: {
    fontSize: 22,
    color: '#81bec1',
    fontWeight: '400',
    marginTop: -1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a1a',
    maxHeight: 100,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#81bec1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C5DEDE',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: -1,
  },

  // Attachment Menu
  menuBackdrop: {
    flex: 1,
  },
  menuBackdropFill: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  menuContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  menuHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D9D9D9',
    alignSelf: 'center',
    marginBottom: 16,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuOptionIcon: {
    fontSize: 22,
  },
  menuOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  menuOptionDesc: {
    fontSize: 13,
    color: '#888',
    marginTop: 1,
  },
});
