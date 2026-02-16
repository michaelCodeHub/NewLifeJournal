import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  updateDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { ChatMessage } from '../../types/chatbot';

// ============ CHAT MESSAGES CRUD OPERATIONS ============

// Add chat message
export const addChatMessage = async (
  userId: string,
  pregnancyId: string,
  messageData: Omit<ChatMessage, 'id' | 'timestamp' | 'pregnancyId'>
): Promise<string> => {
  try {
    const messageRef = collection(db, 'users', userId, 'pregnancies', pregnancyId, 'chatMessages');
    const newMessage = {
      ...messageData,
      pregnancyId,
      timestamp: Timestamp.now(),
    };

    const docRef = await addDoc(messageRef, newMessage);
    await updateDoc(docRef, { id: docRef.id });

    return docRef.id;
  } catch (error) {
    console.error('Error adding chat message:', error);
    throw error;
  }
};

// Get chat messages (for initial load)
export const getChatMessages = async (
  userId: string,
  pregnancyId: string,
  messageLimit: number = 50
): Promise<ChatMessage[]> => {
  try {
    const messageRef = collection(db, 'users', userId, 'pregnancies', pregnancyId, 'chatMessages');
    const q = query(messageRef, orderBy('timestamp', 'desc'), limit(messageLimit));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => doc.data() as ChatMessage).reverse();
  } catch (error) {
    console.error('Error getting chat messages:', error);
    throw error;
  }
};

// Subscribe to chat messages (real-time updates)
export const subscribeToChatMessages = (
  userId: string,
  pregnancyId: string,
  callback: (messages: ChatMessage[]) => void,
  messageLimit: number = 50
): (() => void) => {
  const messageRef = collection(db, 'users', userId, 'pregnancies', pregnancyId, 'chatMessages');
  const q = query(messageRef, orderBy('timestamp', 'desc'), limit(messageLimit));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => doc.data() as ChatMessage).reverse();
    callback(messages);
  });
};
