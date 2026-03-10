import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ChatMessage, ChatAttachment } from '../types/chatbot';
import { useAuth } from './AuthContext';
import { usePregnancy } from './PregnancyContext';
import {
  subscribeToChatMessages,
  addChatMessage as addChatMessageService,
} from '../services/firebase/chatbotService';
import { uploadChatAttachment } from '../services/firebase/storageService';
import { getWeekInfo } from '../services/firebase/weekInfoService';
import { AIServiceFactory } from '../services/ai/aiServiceFactory';
import {
  IAIService,
  AIRequest,
  AIImageData,
  PregnancyContext as AIPregnancyContext,
  WeekInfo,
} from '../services/ai/types';

export interface PickedAttachment {
  uri: string;
  name: string;
  mimeType: string;
  type: 'image' | 'document';
}

interface ChatbotContextType {
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  sendMessage: (content: string, attachments?: PickedAttachment[]) => Promise<void>;
  clearError: () => void;
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

export const ChatbotProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { pregnancy, hospitalVisits, symptoms, milestones } = usePregnancy();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiService, setAiService] = useState<IAIService | null>(null);
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null);

  // Fetch week info when pregnancy week changes
  useEffect(() => {
    if (!pregnancy) {
      setWeekInfo(null);
      return;
    }

    const fetchWeekInfo = async () => {
      const info = await getWeekInfo(pregnancy.currentWeek);
      setWeekInfo(info as WeekInfo | null);
    };

    fetchWeekInfo();
  }, [pregnancy?.currentWeek]);

  // Initialize AI service
  useEffect(() => {
    try {
      const service = AIServiceFactory.createService();
      setAiService(service);
    } catch (err: any) {
      console.error('Failed to initialize AI service:', err);
      setError(err.message || 'Failed to initialize AI service');
    }
  }, []);

  // Subscribe to chat messages
  useEffect(() => {
    if (!user || !pregnancy || !pregnancy.id) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToChatMessages(
      user.uid,
      pregnancy.id,
      (chatMessages) => {
        setMessages(chatMessages);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, pregnancy]);

  // Send message to AI
  const sendMessage = async (content: string, attachments?: PickedAttachment[]) => {
    if (!user || !pregnancy || !aiService) {
      setError('Cannot send message: missing user, pregnancy, or AI service');
      return;
    }

    try {
      setSending(true);
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
              pregnancy.id,
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

      // Save user message to Firestore (with attachment URLs)
      await addChatMessageService(user.uid, pregnancy.id, {
        role: 'user',
        content,
        ...(firestoreAttachments && firestoreAttachments.length > 0
          ? { attachments: firestoreAttachments }
          : {}),
      });

      // Build context for AI
      const context: AIPregnancyContext = {
        pregnancy,
        recentVisits: hospitalVisits.slice(0, 5),
        recentSymptoms: symptoms.slice(0, 5),
        allSymptoms: symptoms,
        recentMilestones: milestones.slice(0, 3),
        weekInfo,
      };

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

      // Build system prompt with pregnancy context
      const systemPrompt = aiService.buildSystemPrompt(context);

      // Send to AI
      const aiRequest: AIRequest = {
        messages: conversationHistory,
        systemPrompt,
        temperature: 0.7,
        maxTokens: 1024,
      };

      const aiResponse = await aiService.sendMessage(aiRequest);

      // Save AI response to Firestore
      await addChatMessageService(user.uid, pregnancy.id, {
        role: 'assistant',
        content: aiResponse.content,
        metadata: {
          tokens: aiResponse.usage?.totalTokens,
        },
      });
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');

      // Save error message to show in chat
      if (user && pregnancy) {
        await addChatMessageService(user.uid, pregnancy.id, {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          metadata: {
            error: true,
          },
        });
      }
    } finally {
      setSending(false);
    }
  };

  const clearError = () => setError(null);

  const value: ChatbotContextType = {
    messages,
    loading,
    sending,
    error,
    sendMessage,
    clearError,
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
