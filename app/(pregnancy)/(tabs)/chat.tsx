import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, ListRenderItem, Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon, IconName } from '../../../components/ui/Icon';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useChatbot, PickedAttachment } from '../../../context/ChatbotContext';
import { usePregnancy } from '../../../context/PregnancyContext';
import { Theme, useTheme, useThemedStyles, GUTTER, RADIUS, SPACE } from '../../../context/ThemeContext';
import type { ChatMessage } from '../../../types/chatbot';
import {
  Button,
  Card,
  ConfirmSheet,
  HeaderAction,
  ListRow,
  Screen,
  ScreenState,
  Sheet,
  Text,
  useToast,
} from '../../../components/ui';
import { MessageBubble, TypingIndicator } from '../../../components/chat/MessageBubble';
import { Composer, MAX_ATTACHMENTS } from '../../../components/chat/Composer';
import { ChatEmptyState } from '../../../components/chat/ChatEmptyState';
import { AiConsent } from '../../../components/chat/AiConsent';
import { setConsent, useConsent } from '../../../services/monitoring/consent';

// Lazy imports to avoid crash when native modules aren't built yet
const getImagePicker = () => require('expo-image-picker') as typeof import('expo-image-picker');
const getDocumentPicker = () => require('expo-document-picker') as typeof import('expo-document-picker');

/** Native pickers can't present while the sheet's modal is still dismissing (iOS). */
const PICKER_DELAY_MS = 500;

const keyExtractor = (m: ChatMessage, i: number) =>
  m.timestamp?.toMillis ? `${m.role}-${m.timestamp.toMillis()}` : m.id || `message-${i}`;

const renderMessage: ListRenderItem<ChatMessage> = ({ item }) => <MessageBubble message={item} />;

export default function ChatScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { messages, loading, sending, error, sendMessage, clearError, clearHistory, isPremium, aiMessageLimit, aiMessagesRemaining } =
    useChatbot();
  const { pregnancy, getCurrentWeek } = usePregnancy();
  const consent = useConsent();

  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<PickedAttachment[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const week = getCurrentWeek() || 1;
  const firstName = (pregnancy?.motherName || '').split(' ')[0];

  // Inverted list: newest message first, so the conversation is anchored to the composer.
  const data = useMemo(() => [...messages].reverse(), [messages]);

  /* ------------------------------------------------------------ attachments */

  const addAttachments = useCallback((next: PickedAttachment[]) => {
    setAttachments((prev) => [...prev, ...next].slice(0, MAX_ATTACHMENTS));
  }, []);

  const afterSheetCloses = useCallback((run: () => Promise<void>) => {
    setAttachOpen(false);
    setTimeout(run, PICKER_DELAY_MS);
  }, []);

  const pickFromGallery = useCallback(() => {
    afterSheetCloses(async () => {
      try {
        const picker = getImagePicker();
        const result = await picker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          allowsMultipleSelection: true,
          selectionLimit: MAX_ATTACHMENTS,
        });
        if (!result.canceled && result.assets.length > 0) {
          addAttachments(
            result.assets.map((asset: any, i: number) => ({
              uri: asset.uri,
              name: asset.fileName || `photo_${Date.now()}_${i}.jpg`,
              mimeType: asset.mimeType || 'image/jpeg',
              type: 'image' as const,
            }))
          );
        }
      } catch {
        toast.show('Photo library needs a development build', 'error');
      }
    });
  }, [afterSheetCloses, addAttachments, toast]);

  const pickFromCamera = useCallback(() => {
    afterSheetCloses(async () => {
      try {
        const picker = getImagePicker();
        const { status } = await picker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          toast.show('Camera access is needed to take photos', 'error');
          return;
        }
        const result = await picker.launchCameraAsync({ quality: 0.7 });
        if (!result.canceled && result.assets.length > 0) {
          const asset = result.assets[0];
          addAttachments([
            {
              uri: asset.uri,
              name: asset.fileName || `camera_${Date.now()}.jpg`,
              mimeType: asset.mimeType || 'image/jpeg',
              type: 'image',
            },
          ]);
        }
      } catch {
        toast.show('Camera needs a development build', 'error');
      }
    });
  }, [afterSheetCloses, addAttachments, toast]);

  const pickDocument = useCallback(() => {
    afterSheetCloses(async () => {
      try {
        const docPicker = getDocumentPicker();
        const result = await docPicker.getDocumentAsync({
          type: ['image/*', 'application/pdf'],
          multiple: true,
        });
        if (!result.canceled && result.assets.length > 0) {
          addAttachments(
            result.assets.map((asset: any) => ({
              uri: asset.uri,
              name: asset.name,
              mimeType: asset.mimeType || 'application/octet-stream',
              type: (asset.mimeType?.startsWith('image/') ? 'image' : 'document') as 'image' | 'document',
            }))
          );
        }
      } catch {
        toast.show('Document picker needs a development build', 'error');
      }
    });
  }, [afterSheetCloses, addAttachments, toast]);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /* ---------------------------------------------------------------- sending */

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const baseText = overrideText ?? inputText;
      if ((!baseText.trim() && attachments.length === 0) || sending) return;

      const messageText = baseText.trim();
      const currentAttachments = [...attachments];
      setInputText('');
      setAttachments([]);
      listRef.current?.scrollToOffset({ offset: 0, animated: true });

      await sendMessage(
        messageText || 'What do you see in this image?',
        currentAttachments.length > 0 ? currentAttachments : undefined
      );
    },
    [inputText, attachments, sending, sendMessage]
  );

  const onComposerSend = useCallback(() => {
    handleSend();
  }, [handleSend]);

  const onSuggestion = useCallback(
    (text: string) => {
      if (sending) return;
      handleSend(text);
    },
    [handleSend, sending]
  );

  const openPaywall = useCallback(() => router.push('/(pregnancy)/paywall'), [router]);

  const canSend = (inputText.trim().length > 0 || attachments.length > 0) && !sending;
  const limitReached = !isPremium && aiMessagesRemaining <= 0;

  /* ---------------------------------------------------------------- states */

  if (loading || !consent.loaded) return <ScreenState loading />;
  if (!consent.ai) {
    return (
      <Screen scroll={false} header={{ title: 'Ask' }}>
        <AiConsent onAgree={() => setConsent({ ai: true })} />
      </Screen>
    );
  }
  if (!pregnancy) {
    return (
      <ScreenState
        icon="leaf-outline"
        title="No active pregnancy"
        body="Set up your pregnancy so the assistant can tailor answers to your week."
        action={<Button title="Set up pregnancy" onPress={() => router.push('/(onboarding)/create-pregnancy')} />}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen
        scroll={false}
        header={{
          title: 'Ask',
          right:
            messages.length > 0 ? (
              <HeaderAction name="trash-outline" onPress={() => setConfirmClear(true)} accessibilityLabel="Clear chat history" />
            ) : undefined,
        }}
        footer={
          <View>
            {error ? (
              <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={styles.error}>
                <Icon name="alert-circle" size={18} color={colors.red} style={styles.errorIcon} />
                <Text variant="footnote" color="red" style={styles.errorText}>
                  {error}
                </Text>
                {limitReached ? <Button title="Upgrade" size="sm" variant="tinted" onPress={openPaywall} /> : null}
                <Button title="Dismiss" size="sm" variant="ghost" onPress={clearError} />
              </Animated.View>
            ) : null}
            <Composer
              value={inputText}
              onChangeText={setInputText}
              onSend={onComposerSend}
              onAttach={() => setAttachOpen(true)}
              onRemoveAttachment={removeAttachment}
              attachments={attachments}
              sending={sending}
              canSend={canSend}
            />
          </View>
        }
      >
        {!isPremium ? (
          <Card
            tone="tinted"
            tint="primaryLight"
            onPress={openPaywall}
            style={styles.usage}
            accessibilityLabel={`${aiMessagesRemaining} of ${aiMessageLimit} free messages left this month. Upgrade`}
          >
            <Icon name="sparkles-outline" size={16} color={colors.primaryDark} />
            <Text variant="footnote" color="textSecondary" style={styles.usageText} numberOfLines={1}>
              <Text variant="footnote" color="textPrimary" tabular>
                {aiMessagesRemaining} of {aiMessageLimit}
              </Text>{' '}
              free messages left this month
            </Text>
            <Text variant="calloutMedium" color="primaryDark">
              Upgrade
            </Text>
          </Card>
        ) : null}

        {messages.length === 0 && !sending ? (
          <ChatEmptyState week={week} name={firstName} disabled={sending} onSuggestion={onSuggestion} />
        ) : (
          <FlatList
            ref={listRef}
            inverted
            data={data}
            keyExtractor={keyExtractor}
            renderItem={renderMessage}
            ListHeaderComponent={sending ? <TypingIndicator /> : undefined}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
            initialNumToRender={12}
            maxToRenderPerBatch={10}
            windowSize={11}
          />
        )}
      </Screen>

      <ConfirmSheet
        visible={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear chat history?"
        body="Every message and attached photo in this conversation will be deleted. This can't be undone."
        confirmLabel="Clear history"
        icon="trash-outline"
        onConfirm={async () => {
          try {
            await clearHistory();
            toast.show('Chat history cleared');
          } catch {
            toast.show("Couldn't clear the chat. Check your connection and try again.", 'error');
          }
        }}
      />

      <Sheet visible={attachOpen} onClose={() => setAttachOpen(false)} title="Add attachment" subtitle="Up to 3 photos or files">
        <Card padded={false}>
          <ListRow
            icon="camera-outline"
            tone="orange"
            title="Take photo"
            subtitle="Use your camera"
            onPress={pickFromCamera}
            chevron={false}
          />
          <ListRow
            icon="images-outline"
            tone="teal"
            title="Photo library"
            subtitle="Choose from your gallery"
            onPress={pickFromGallery}
            chevron={false}
          />
          <ListRow
            icon="document-text-outline"
            tone="plum"
            title="Document"
            subtitle="PDF or image file"
            onPress={pickDocument}
            chevron={false}
            last
          />
        </Card>
      </Sheet>
    </KeyboardAvoidingView>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    flex: { flex: 1 },
    usage: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.sm,
      marginHorizontal: GUTTER,
      marginTop: SPACE.xs,
      marginBottom: SPACE.xs,
      paddingVertical: SPACE.sm + 2,
      paddingHorizontal: SPACE.md,
      borderRadius: RADIUS.md,
    },
    usageText: { flex: 1 },
    listContent: { paddingVertical: SPACE.md },
    error: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.xs,
      marginHorizontal: GUTTER,
      marginBottom: SPACE.sm,
      paddingLeft: SPACE.md,
      paddingRight: SPACE.xs,
      paddingVertical: SPACE.xs,
      borderRadius: RADIUS.md,
      backgroundColor: colors.redTint,
    },
    errorIcon: { marginRight: SPACE.xs },
    errorText: { flex: 1, paddingVertical: SPACE.xs },
  });
