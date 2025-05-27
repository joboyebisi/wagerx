import { db } from './config';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

interface UserWallet {
  publicKey: string;
  privateKey: string;
}

interface UserData {
  telegramId: string;
  wallet?: UserWallet;
  activeWagers: string[];
  completedWagers: string[];
}

export async function createUser(telegramId: string): Promise<void> {
  const userRef = doc(db, 'users', telegramId);
  const userData: UserData = {
    telegramId,
    activeWagers: [],
    completedWagers: [],
  };
  await setDoc(userRef, userData);
}

export async function getUser(telegramId: string): Promise<UserData | null> {
  const userRef = doc(db, 'users', telegramId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return userSnap.data() as UserData;
  }
  return null;
}

export async function updateUserWallet(
  telegramId: string,
  wallet: UserWallet
): Promise<void> {
  const userRef = doc(db, 'users', telegramId);
  await updateDoc(userRef, { wallet });
}

export async function addActiveWager(
  telegramId: string,
  wagerId: string
): Promise<void> {
  const userRef = doc(db, 'users', telegramId);
  const userData = await getUser(telegramId);
  if (userData) {
    await updateDoc(userRef, {
      activeWagers: [...userData.activeWagers, wagerId],
    });
  }
}

export async function completeWager(
  telegramId: string,
  wagerId: string
): Promise<void> {
  const userRef = doc(db, 'users', telegramId);
  const userData = await getUser(telegramId);
  if (userData) {
    await updateDoc(userRef, {
      activeWagers: userData.activeWagers.filter(id => id !== wagerId),
      completedWagers: [...userData.completedWagers, wagerId],
    });
  }
} 