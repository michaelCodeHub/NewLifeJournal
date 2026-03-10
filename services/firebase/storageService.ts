import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';

/**
 * Upload a chat attachment (image or document) to Firebase Storage.
 * Returns the public download URL.
 */
/**
 * Upload a week image to Firebase Storage.
 * Path: weekImages/week{weekNumber}.png
 * Returns the public download URL.
 */
export const uploadWeekImage = async (weekNumber: number, fileUri: string): Promise<string> => {
  const storagePath = `weekImages/week${weekNumber}.png`;
  const storageRef = ref(storage, storagePath);

  const response = await fetch(fileUri);
  const blob = await response.blob();

  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
};

export const uploadChatAttachment = async (
  userId: string,
  pregnancyId: string,
  fileUri: string,
  fileName: string
): Promise<string> => {
  const timestamp = Date.now();
  const storagePath = `chatAttachments/${userId}/${pregnancyId}/${timestamp}_${fileName}`;
  const storageRef = ref(storage, storagePath);

  // Fetch the file as a blob
  const response = await fetch(fileUri);
  const blob = await response.blob();

  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
};
