'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import Dashboard from '@/components/Dashboard';
import WalletConnect from '@/components/WalletConnect';
import { useTelegram } from '@/lib/hooks/useTelegram';

export default function Home() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const { isReady: telegramReady, isTelegram, user: telegramUser } = useTelegram();

  if (!ready || !telegramReady) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Initializing...</p>
      </div>
    );
  }

  return (
    <main>
      {!authenticated ? <WalletConnect /> : <Dashboard />}
    </main>
  );
}

