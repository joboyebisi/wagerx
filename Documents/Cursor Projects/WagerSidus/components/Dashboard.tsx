'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import NaturalLanguageInput from './NaturalLanguageInput';
import SwapTokens from './SwapTokens';
import { perplexityService, WagerIntent } from '@/lib/services/perplexity';
import { memoryService } from '@/lib/services/memory';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { user, authenticated } = usePrivy();
  const router = useRouter();
  const [recentWagers, setRecentWagers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      loadRecentWagers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, user]);

  const loadRecentWagers = async () => {
    if (!user?.wallet?.address) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/wagers?address=${user.wallet.address}`);
      if (response.ok) {
        const wagers = await response.json();
        setRecentWagers(wagers.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to load wagers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIntentDetected = async (intent: WagerIntent, message: string) => {
    if (!user?.wallet?.address) return;

    try {
      // Store interaction in memory
      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: user.wallet.address,
          entry: {
            type: 'interaction',
            data: { intent, userMessage: message },
            chainId: 56,
            participants: intent.participants || [user.wallet.address],
          },
        }),
      });

      switch (intent.type) {
        case 'create':
          router.push(`/wagers/create?intent=${encodeURIComponent(JSON.stringify(intent))}&message=${encodeURIComponent(message)}`);
          break;
        case 'accept':
          if (intent.wagerId) {
            router.push(`/wagers/${intent.wagerId}`);
          }
          break;
        case 'resolve':
          if (intent.wagerId) {
            router.push(`/wagers/${intent.wagerId}?action=resolve`);
          }
          break;
        case 'query':
          router.push('/wagers');
          break;
        default:
          console.log('Unknown intent:', intent);
      }
    } catch (error) {
      console.error('Error handling intent:', error);
      alert('Failed to process your request. Please try again.');
    }
  };

  if (!authenticated) {
    return null;
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardHeader}>
        <h1>WagerSidus</h1>
        <p className={styles.subtitle}>Wager with friends using natural language</p>
      </div>

      <div className={styles.dashboardContent}>
        <div className={styles.naturalLanguageSection}>
          <h2>Create a Wager</h2>
          <NaturalLanguageInput onIntentDetected={handleIntentDetected} />
        </div>

        <div className={styles.quickActions}>
          <button
            className={styles.actionButton}
            onClick={() => router.push('/wagers/create')}
          >
            📝 Create Wager
          </button>
          <button
            className={styles.actionButton}
            onClick={() => router.push('/wagers')}
          >
            📋 My Wagers
          </button>
        </div>

        <div className={styles.swapSection}>
          <SwapTokens />
        </div>

        {recentWagers.length > 0 && (
          <div className={styles.recentWagers}>
            <h2>Recent Wagers</h2>
            <div className={styles.wagerList}>
              {recentWagers.map((wager) => (
                <div
                  key={wager.id}
                  className={styles.wagerCard}
                  onClick={() => router.push(`/wagers/${wager.id}`)}
                >
                  <div className={styles.wagerHeader}>
                    <span className={styles.wagerId}>#{wager.id.slice(-8)}</span>
                    <span className={`${styles.wagerStatus} ${styles[wager.status]}`}>
                      {wager.status}
                    </span>
                  </div>
                  <p className={styles.wagerCondition}>{wager.condition}</p>
                  <div className={styles.wagerDetails}>
                    <span>💰 {wager.amount} BNB</span>
                    <span>👥 {wager.participants.length} participants</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

