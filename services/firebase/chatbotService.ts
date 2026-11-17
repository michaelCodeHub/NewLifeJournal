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
  writeBatch,
} from 'firebase/firestore';
import { deleteObject, listAll, ref } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { ChatMessage } from '../../types/chatbot';

/**
 * Where a conversation lives: under the pregnancy in pregnancy mode, under the
 * baby in baby mode (users/{uid}/{kind}/{id}/chatMessages). Attachments go to
 * chatAttachments/{uid}/{id}/ either way.
 */
export interface ChatScope {
  kind: 'pregnancies' | 'babies';
  id: string;
}

const messagesRef = (userId: string, scope: ChatScope) => collection(db, 'users', userId, scope.kind, scope.id, 'chatMessages');

// ============ CHAT MESSAGES CRUD OPERATIONS ============

// Add chat message
export const addChatMessage = async (
  userId: string,
  scope: ChatScope,
  messageData: Omit<ChatMessage, 'id' | 'timestamp' | 'pregnancyId' | 'babyId'>
): Promise<string> => {
  try {
    const messageRef = messagesRef(userId, scope);
    const newMessage = {
      ...messageData,
      ...(scope.kind === 'babies' ? { babyId: scope.id } : { pregnancyId: scope.id }),
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
  scope: ChatScope,
  messageLimit: number = 50
): Promise<ChatMessage[]> => {
  try {
    const messageRef = messagesRef(userId, scope);
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
  scope: ChatScope,
  callback: (messages: ChatMessage[]) => void,
  messageLimit: number = 50
): (() => void) => {
  const messageRef = messagesRef(userId, scope);
  const q = query(messageRef, orderBy('timestamp', 'desc'), limit(messageLimit));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => doc.data() as ChatMessage).reverse();
    callback(messages);
  });
};

/**
 * Deletes the whole conversation (pregnancy or baby), including photos
 * attached to it. Free-tier usage is tracked separately (server-side), so
 * clearing doesn't reset the monthly allowance.
 */
export const clearChatHistory = async (userId: string, scope: ChatScope): Promise<void> => {
  const messageRef = messagesRef(userId, scope);
  const snapshot = await getDocs(messageRef);
  for (let i = 0; i < snapshot.docs.length; i += 450) {
    const batch = writeBatch(db);
    snapshot.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  // Photos are removed in the background, best effort: the messages are already gone,
  // and Storage retries failures for up to two minutes, which would freeze the confirm sheet.
  listAll(ref(storage, `chatAttachments/${userId}/${scope.id}`))
    .then((files) => Promise.all(files.items.map((item) => deleteObject(item))))
    .catch((error) => console.warn('Could not remove chat attachments:', error));
};
