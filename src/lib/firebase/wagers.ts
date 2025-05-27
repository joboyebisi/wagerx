import { db } from './config';
import { collection, doc, setDoc, getDoc, updateDoc, addDoc, getDocs, query, where } from 'firebase/firestore';

export interface Wager {
  id: string;
  description: string;
  participants: string[]; // Telegram user IDs
  amounts: { [key: string]: number }; // Amount in SOL for each participant
  status: 'pending' | 'active' | 'completed';
  winner?: string; // Telegram user ID of the winner
  createdAt: number;
  completedAt?: number;
  verificationMethod: string;
  deadline?: number;
  asset?: string;
  escrowPublicKey?: string;
  escrowPrivateKey?: string;
}

export async function createWager(wager: Omit<Wager, 'id' | 'createdAt'>): Promise<string> {
  const wagersRef = collection(db, 'wagers');
  const newWagerRef = doc(wagersRef);
  const wagerId = newWagerRef.id;

  const wagerData: Wager = {
    ...wager,
    id: wagerId,
    createdAt: Date.now(),
  };

  await setDoc(newWagerRef, wagerData);
  return wagerId;
}

export async function getWager(wagerId: string): Promise<Wager | null> {
  const wagerRef = doc(db, 'wagers', wagerId);
  const wagerSnap = await getDoc(wagerRef);

  if (wagerSnap.exists()) {
    return wagerSnap.data() as Wager;
  }
  return null;
}

export async function updateWagerStatus(
  wagerId: string,
  status: Wager['status'],
  winner?: string
): Promise<void> {
  const wagerRef = doc(db, 'wagers', wagerId);
  const updateData: Partial<Wager> = {
    status,
    ...(winner && { winner }),
    ...(status === 'completed' && { completedAt: Date.now() }),
  };

  await updateDoc(wagerRef, updateData);
}

export async function getUserActiveWagers(telegramId: string): Promise<Wager[]> {
  const wagersRef = collection(db, 'wagers');
  const q = query(wagersRef, where('participants', 'array-contains', telegramId), where('status', '==', 'active'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as Wager);
}

export async function getUserCompletedWagers(telegramId: string): Promise<Wager[]> {
  const wagersRef = collection(db, 'wagers');
  const q = query(wagersRef, where('participants', 'array-contains', telegramId), where('status', '==', 'completed'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as Wager);
} 