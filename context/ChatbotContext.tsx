import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ChatMessage } from '../types/chatbot';
import { useAuth } from './AuthContext';
import { usePregnancy } from './PregnancyContext';
import {
  subscribeToChatMessages,
  addChatMessage as addChatMessageService,
} from '../services/firebase/chatbotService';
import { AIServiceFactory } from '../services/ai/aiServiceFactory';
import {
  IAIService,
  AIRequest,
  PregnancyContext as AIPregnancyContext,
} from '../services/ai/types';

interface ChatbotContextType {
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
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
  const sendMessage = async (content: string) => {
    if (!user || !pregnancy || !aiService) {
      setError('Cannot send message: missing user, pregnancy, or AI service');
      return;
    }

    try {
      setSending(true);
      setError(null);

      // Save user message to Firestore
      await addChatMessageService(user.uid, pregnancy.id, {
        role: 'user',
        content,
      });

      // Build context for AI
      const context: AIPregnancyContext = {
        pregnancy,
        recentVisits: hospitalVisits.slice(0, 5),
        recentSymptoms: symptoms.slice(0, 5),
        recentMilestones: milestones.slice(0, 3),
      };

      // Prepare conversation history (last 10 messages)
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Add current user message
      conversationHistory.push({
        role: 'user',
        content,
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
