'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import styles from './SwapTokens.module.css';

export default function SwapTokens() {
  const { user } = usePrivy();
  const [linkAmount, setLinkAmount] = useState('5');
  const [isSwapping, setIsSwapping] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null);

  const handleSwap = async () => {
    if (!user?.wallet?.address) {
      alert('Please connect your wallet first');
      return;
    }

    if (!linkAmount || parseFloat(linkAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsSwapping(true);
    setResult(null);

    try {
      const response = await fetch('/api/swap/link-to-bnb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: linkAmount,
          walletAddress: user.wallet.address,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: `Successfully swapped ${linkAmount} LINK for BNB!`,
          txHash: data.txHash,
        });
      } else {
        setResult({
          success: false,
          message: data.error || 'Swap failed',
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Swap failed',
      });
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className={styles.swapContainer}>
      <h2>Swap LINK for BNB</h2>
      <p className={styles.description}>
        Convert your LINK tokens to BNB for gas fees and contract deployment.
      </p>

      <div className={styles.inputGroup}>
        <label>
          LINK Amount:
          <input
            type="number"
            value={linkAmount}
            onChange={(e) => setLinkAmount(e.target.value)}
            placeholder="5"
            min="0.1"
            step="0.1"
            disabled={isSwapping}
          />
        </label>
        <p className={styles.hint}>You have 25 LINK tokens available</p>
      </div>

      <button
        onClick={handleSwap}
        disabled={isSwapping || !user?.wallet?.address}
        className={styles.swapButton}
      >
        {isSwapping ? 'Swapping...' : 'Swap LINK → BNB'}
      </button>

      {result && (
        <div className={`${styles.result} ${result.success ? styles.success : styles.error}`}>
          <p>{result.message}</p>
          {result.txHash && (
            <a
              href={`https://testnet.bscscan.com/tx/${result.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.txLink}
            >
              View Transaction on BSCScan
            </a>
          )}
        </div>
      )}

      <div className={styles.info}>
        <p>⚠️ Note: You need at least 0.001 BNB for gas fees to perform the swap.</p>
        <p>If you don&apos;t have BNB, try getting a tiny amount from a faucet first.</p>
      </div>
    </div>
  );
}

