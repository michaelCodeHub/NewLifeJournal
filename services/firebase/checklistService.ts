import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

export interface ChecklistItem {
  id: string;
  pregnancyId: string;
  category: string;
  name: string;
  checked: boolean;
  isCustom: boolean;
  notes?: string;
  createdAt: Timestamp;
}

export const CHECKLIST_CATEGORIES = [
  'Nursery',
  'Clothing',
  'Feeding',
  'Health & Safety',
  'Travel',
  'Hospital Bag',
] as const;

export const DEFAULT_ITEMS: Omit<ChecklistItem, 'id' | 'pregnancyId' | 'createdAt'>[] = [
  // Nursery
  { category: 'Nursery', name: 'Crib or bassinet', checked: false, isCustom: false },
  { category: 'Nursery', name: 'Mattress and waterproof cover', checked: false, isCustom: false },
  { category: 'Nursery', name: 'Baby monitor', checked: false, isCustom: false },
  { category: 'Nursery', name: 'Changing table or pad', checked: false, isCustom: false },
  { category: 'Nursery', name: 'Dresser or storage', checked: false, isCustom: false },
  // Clothing
  { category: 'Clothing', name: 'Onesies (newborn & 0-3M)', checked: false, isCustom: false },
  { category: 'Clothing', name: 'Sleepers / footie pajamas', checked: false, isCustom: false },
  { category: 'Clothing', name: 'Hats and mittens', checked: false, isCustom: false },
  { category: 'Clothing', name: 'Socks (6+ pairs)', checked: false, isCustom: false },
  { category: 'Clothing', name: 'Swaddle blankets', checked: false, isCustom: false },
  // Feeding
  { category: 'Feeding', name: 'Bottles (4–6)', checked: false, isCustom: false },
  { category: 'Feeding', name: 'Breast pump', checked: false, isCustom: false },
  { category: 'Feeding', name: 'Nursing bras (2–3)', checked: false, isCustom: false },
  { category: 'Feeding', name: 'Burp cloths (6+)', checked: false, isCustom: false },
  { category: 'Feeding', name: 'Baby formula (if not breastfeeding)', checked: false, isCustom: false },
  // Health & Safety
  { category: 'Health & Safety', name: 'Baby thermometer', checked: false, isCustom: false },
  { category: 'Health & Safety', name: 'Nail clippers / file', checked: false, isCustom: false },
  { category: 'Health & Safety', name: 'Baby first aid kit', checked: false, isCustom: false },
  { category: 'Health & Safety', name: 'Baby-safe laundry detergent', checked: false, isCustom: false },
  { category: 'Health & Safety', name: 'Cabinet locks and outlet covers', checked: false, isCustom: false },
  // Travel
  { category: 'Travel', name: 'Infant car seat', checked: false, isCustom: false },
  { category: 'Travel', name: 'Stroller', checked: false, isCustom: false },
  { category: 'Travel', name: 'Baby carrier / wrap', checked: false, isCustom: false },
  { category: 'Travel', name: 'Diaper bag', checked: false, isCustom: false },
  // Hospital Bag
  { category: 'Hospital Bag', name: 'Insurance cards and ID', checked: false, isCustom: false },
  { category: 'Hospital Bag', name: 'Birth plan', checked: false, isCustom: false },
  { category: 'Hospital Bag', name: 'Comfortable clothes for labor', checked: false, isCustom: false },
  { category: 'Hospital Bag', name: 'Toiletries', checked: false, isCustom: false },
  { category: 'Hospital Bag', name: 'Going-home outfit for baby', checked: false, isCustom: false },
  { category: 'Hospital Bag', name: 'Phone charger', checked: false, isCustom: false },
];

const getItemsRef = (userId: string, pregnancyId: string) =>
  collection(db, 'users', userId, 'pregnancies', pregnancyId, 'checklistItems');

export const initializeChecklist = async (userId: string, pregnancyId: string): Promise<void> => {
  const ref = getItemsRef(userId, pregnancyId);
  const existing = await getDocs(ref);
  if (!existing.empty) return; // Already initialized
  const batch = writeBatch(db);
  DEFAULT_ITEMS.forEach(item => {
    const docRef = doc(ref);
    batch.set(docRef, { ...item, pregnancyId, createdAt: Timestamp.now() });
  });
  await batch.commit();
};

export const subscribeToChecklist = (
  userId: string,
  pregnancyId: string,
  callback: (items: ChecklistItem[]) => void
): (() => void) => {
  const q = query(getItemsRef(userId, pregnancyId), orderBy('category'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChecklistItem)));
  });
};

export const toggleChecklistItem = async (
  userId: string,
  pregnancyId: string,
  itemId: string,
  checked: boolean
): Promise<void> => {
  await updateDoc(
    doc(db, 'users', userId, 'pregnancies', pregnancyId, 'checklistItems', itemId),
    { checked }
  );
};

export const addCustomChecklistItem = async (
  userId: string,
  pregnancyId: string,
  name: string,
  category: string
): Promise<void> => {
  await addDoc(getItemsRef(userId, pregnancyId), {
    pregnancyId,
    category,
    name,
    checked: false,
    isCustom: true,
    createdAt: Timestamp.now(),
  });
};

export const deleteChecklistItem = async (
  userId: string,
  pregnancyId: string,
  itemId: string
): Promise<void> => {
  await deleteDoc(
    doc(db, 'users', userId, 'pregnancies', pregnancyId, 'checklistItems', itemId)
  );
};
