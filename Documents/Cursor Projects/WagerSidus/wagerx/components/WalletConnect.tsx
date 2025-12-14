'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useState } from 'react';
import styles from './WalletConnect.module.css';

export default function WalletConnect() {
  const { login, ready } = usePrivy();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!ready) return;
    
    setIsConnecting(true);
    try {
      await login();
    } catch (error) {
      console.error('Wallet connection error:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className={styles.walletConnect}>
      <div className={styles.walletConnectContent}>
        <h1>Welcome to WagerX</h1>
        <p>Connect your wallet to start wagering with friends</p>
        <div className={styles.walletOptions}>
          <div className={`${styles.walletOption} ${styles.preferred}`}>
            <span className={styles.walletBadge}>Recommended</span>
            <h3>Connect Existing Wallet</h3>
            <p>Use your MetaMask, WalletConnect, Coinbase Wallet, or other existing wallet</p>
          </div>
          <div className={styles.walletOption}>
            <h3>TON Wallet</h3>
            <p>Connect via Telegram&apos;s native wallet (Optional)</p>
          </div>
        </div>
        <button
          className={styles.connectButton}
          onClick={handleConnect}
          disabled={!ready || isConnecting}
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      </div>
    </div>
  );
}

