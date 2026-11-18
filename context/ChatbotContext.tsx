import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { ChatMessage, ChatAttachment } from '../types/chatbot';
import { useAuth } from './AuthContext';
import { usePregnancy } from './PregnancyContext';
import { useBaby } from './BabyContext';
import { BABY_MODE_ENABLED } from '../constants/features';
import { useSubscription } from './SubscriptionContext';
import {
  subscribeToChatMessages,
  addChatMessage as addChatMessageService,
  clearChatHistory,
  ChatScope,
} from '../services/firebase/chatbotService';
import { uploadChatAttachment } from '../services/firebase/storageService';
import { getWeekInfo } from '../services/firebase/weekInfoService';
import { calculatePregnancyWeek } from '../services/firebase/pregnancyService';
import { AIServiceFactory } from '../services/ai/aiServiceFactory';
import {
  IAIService,
  AIRequest,
  AIImageData,
  PregnancyContext as AIPregnancyContext,
  WeekInfo,
} from '../services/ai/types';
import { trackEvent } from '../services/monitoring/analytics';
import { logError } from '../services/monitoring/errorLogger';
import { withNetworkTrace } from '../services/monitoring/networkTrace';

export interface PickedAttachment {
  uri: string;
  name: string;
  mimeType: string;
  type: 'image' | 'document';
}

interface ChatbotContextType {
  /** Who the conversation is about: the pregnancy, the baby, or nobody yet. */
  mode: 'pregnancy' | 'baby' | null;
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  /**
   * The assistant's reply in progress: `waiting` until the first words arrive,
   * then `streaming` with the text so far. null once the reply is saved.
   */
  reply: ChatReply | null;
  error: string | null;
  sendMessage: (content: string, attachments?: PickedAttachment[]) => Promise<void>;
  clearError: () => void;
  /** Deletes every message (and attached photo) in the current conversation. */
  clearHistory: () => Promise<void>;
  // Free-tier AI message cap — see MONETIZATION_PLAN.md
  isPremium: boolean;
  aiMessageLimit: number;
  aiMessagesRemaining: number;
}

export type ChatReply = { state: 'waiting' } | { state: 'streaming'; text: string };

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

export const ChatbotProvider = ({ children }: { children: ReactNode }) => {
  const { user, userProfile } = useAuth();
  const { pregnancy, hospitalVisits, symptoms, milestones } = usePregnancy();
  const { baby } = useBaby();
  const { isPremium, canSendAiMessage, applyServerAiUsage, aiMessageLimit, aiMessagesRemaining } =
    useSubscription();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The reply being written; `final` is set once it is complete and being saved.
  const [stream, setStream] = useState<{ text: string; final?: string } | null>(null);
  const [aiService, setAiService] = useState<IAIService | null>(null);
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null);

  // In baby mode the conversation lives under the baby; otherwise under the pregnancy.
  const babyMode = BABY_MODE_ENABLED && userProfile?.currentMode === 'baby';
  const scopeKind: ChatScope['kind'] | null = babyMode ? (baby ? 'babies' : null) : pregnancy ? 'pregnancies' : null;
  const scopeId = scopeKind === 'babies' ? baby?.id : scopeKind === 'pregnancies' ? pregnancy?.id : undefined;
  const scope = useMemo<ChatScope | null>(() => (scopeKind && scopeId ? { kind: scopeKind, id: scopeId } : null), [scopeKind, scopeId]);
  const mode = scope ? (scope.kind === 'babies' ? 'baby' : 'pregnancy') : null;

  // Derived from the due date (the stored `currentWeek` field goes stale).
  const dueMillis = pregnancy?.dueDate?.toMillis?.();
  const week = dueMillis ? calculatePregnancyWeek(new Date(dueMillis)) : null;

  // Fetch week info when pregnancy week changes
  useEffect(() => {
    if (!week) {
      setWeekInfo(null);
      return;
    }
    let cancelled = false;
    getWeekInfo(week).then((info) => {
      if (!cancelled) setWeekInfo(info as WeekInfo | null);
    });
    return () => {
      cancelled = true;
    };
  }, [week]);

  // Initialize AI service
  useEffect(() => {
    try {
      const service = AIServiceFactory.createService();
      setAiService(service);
    } catch (err: any) {
      logError(err, { screen: 'chat', action: 'initAiService' });
      setError(err.message || 'Failed to initialize AI service');
    }
  }, []);

  // Subscribe to chat messages
  useEffect(() => {
    if (!user || !scope) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToChatMessages(
      user.uid,
      scope,
      (chatMessages) => {
        setMessages(chatMessages);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, scope]);

  // Send message to AI
  const sendMessage = async (content: string, attachments?: PickedAttachment[]) => {
    if (!user || !scope || !aiService) {
      const missing = [
        !user && 'not signed in',
        !scope && (babyMode ? 'no baby profile' : 'no active pregnancy'),
        !aiService && 'AI service not initialized (check API key / restart Expo)',
      ].filter(Boolean).join(', ');
      setError(`Cannot send message: ${missing}`);
      return;
    }

    if (!canSendAiMessage) {
      setError(
        `You've used all ${aiMessageLimit} free AI messages this month. Upgrade to Plus for unlimited answers.`
      );
      return;
    }

    try {
      setSending(true);
      setStream(null);
      setError(null);

      // Upload attachments to Firebase Storage and read as base64
      let firestoreAttachments: ChatAttachment[] | undefined;
      let imageDataForAI: AIImageData[] | undefined;

      if (attachments && attachments.length > 0) {
        firestoreAttachments = [];
        imageDataForAI = [];

        for (const att of attachments) {
          // Try uploading to Firebase Storage (optional — may fail if rules not set)
          let downloadUrl = att.uri;
          try {
            downloadUrl = await uploadChatAttachment(
              user.uid,
              scope.id,
              att.uri,
              att.name
            );
          } catch (uploadErr) {
            console.warn('Storage upload failed, using local URI:', uploadErr);
          }

          firestoreAttachments.push({
            url: downloadUrl,
            type: att.type,
            name: att.name,
            mimeType: att.mimeType,
          });

          // Read image files as base64 for the LLM
          if (att.type === 'image') {
            const response = await fetch(att.uri);
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                // Strip the data URL prefix (e.g. "data:image/jpeg;base64,")
                const result = reader.result as string;
                const base64Data = result.split(',')[1] || result;
                resolve(base64Data);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            imageDataForAI.push({ base64, mimeType: att.mimeType });
          }
        }

        if (imageDataForAI.length === 0) imageDataForAI = undefined;
      }

      // Save the user's message (with attachment URLs). It shows in the list at
      // once (local write); the server confirmation is awaited only before the
      // reply is saved, so the question doesn't wait on it to reach the AI.
      const userMessageSaved = addChatMessageService(user.uid, scope, {
        role: 'user',
        content,
        ...(firestoreAttachments && firestoreAttachments.length > 0
          ? { attachments: firestoreAttachments }
          : {}),
      });
      userMessageSaved.catch(() => {
        /* reported below when awaited */
      });

      // The server (functions/src/systemPrompt.ts) builds the real system
      // prompt from Firestore for both modes; this local one is ignored by the
      // backend provider and kept only for the provider interface.
      const context: AIPregnancyContext | null =
        scope.kind === 'pregnancies' && pregnancy
          ? {
              pregnancy,
              recentVisits: hospitalVisits.slice(0, 5),
              recentSymptoms: symptoms.slice(0, 5),
              allSymptoms: symptoms,
              recentMilestones: milestones.slice(0, 3),
              weekInfo,
            }
          : null;

      // Prepare conversation history (last 10 messages, without images from old messages)
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Add current user message with images
      conversationHistory.push({
        role: 'user' as const,
        content,
        ...(imageDataForAI ? { images: imageDataForAI } : {}),
      });

      const systemPrompt = context ? aiService.buildSystemPrompt(context) : '';

      // Send to AI
      const aiRequest: AIRequest = {
        messages: conversationHistory,
        systemPrompt,
        temperature: 0.7,
        maxTokens: 1024,
        ...(scope.kind === 'babies' ? { babyId: scope.id } : {}),
      };

      const requestStartedAt = Date.now();
      const aiResponse = await withNetworkTrace(
        'ai_chat_request',
        {},
        () => aiService.sendMessage(aiRequest, (text) => setStream({ text }))
      );
      // Keep showing the finished reply until its saved copy is in the list.
      setStream({ text: aiResponse.content, final: aiResponse.content });
      const responseTimeMs = Date.now() - requestStartedAt;

      await userMessageSaved;

      // Save AI response to Firestore
      await addChatMessageService(user.uid, scope, {
        role: 'assistant',
        content: aiResponse.content,
        metadata: {
          tokens: aiResponse.usage?.totalTokens,
        },
      });

      trackEvent('chat_message_sent', {
        response_time_ms: responseTimeMs,
        success: true,
      });

      // The aiChat Cloud Function already enforced the free-tier cap and
      // incremented the server-side counter before responding — just mirror
      // its answer into local UI state, no separate Firestore write needed.
      if (aiResponse.aiUsage) {
        applyServerAiUsage(aiResponse.aiUsage);
      }
    } catch (err: any) {
      logError(err, { screen: 'chat', action: 'sendMessage' });
      setError(err.message || 'Failed to send message');
      trackEvent('chat_message_sent', { success: false });

      // Save error message to show in chat
      if (user && scope) {
        await addChatMessageService(user.uid, scope, {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          metadata: {
            error: true,
          },
        });
      }
    } finally {
      setSending(false);
      setStream(null);
    }
  };

  const clearError = () => setError(null);

  const clearHistory = async () => {
    if (!user || !scope) return;
    await clearChatHistory(user.uid, scope);
    setError(null);
    trackEvent('chat_cleared');
  };

  // Hand over from the live reply to the saved message without a frame of both
  // (or of neither): once the saved copy is the newest message, the live one goes.
  const last = messages[messages.length - 1];
  const reply: ChatReply | null = useMemo(() => {
    if (stream?.final !== undefined && last?.role === 'assistant' && last.content === stream.final) return null;
    if (stream?.text) return { state: 'streaming', text: stream.text };
    return sending ? { state: 'waiting' } : null;
  }, [stream, sending, last]);

  const value: ChatbotContextType = {
    mode,
    messages,
    loading,
    sending,
    reply,
    error,
    sendMessage,
    clearError,
    clearHistory,
    isPremium,
    aiMessageLimit,
    aiMessagesRemaining,
  };

  return <ChatbotContext.Provider value={value}>{children}</ChatbotContext.Provider>;
};

export const useChatbot = () => {
  const context = useContext(ChatbotContext);
  if (context === undefined) {
    throw new Error('useChatbot must be used within a ChatbotProvider');
  }
  return context;
};
