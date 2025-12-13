'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useTelegram } from '@/lib/hooks/useTelegram';
import styles from './ComprehensiveSwap.module.css';

export type SwapProvider = 'uniswap' | 'wormhole' | 'circle-cctp' | 'link-to-bnb';

export interface SwapConfig {
  provider: SwapProvider;
  fromToken: string;
  toToken: string;
  fromChain: string;
  toChain: string;
  minAmount?: string;
  maxAmount?: string;
}

export default function ComprehensiveSwap() {
  const { user } = usePrivy();
  const { showAlert } = useTelegram();
  const [provider, setProvider] = useState<SwapProvider>('uniswap');
  const [fromToken, setFromToken] = useState('LINK');
  const [toToken, setToToken] = useState('BNB');
  const [amount, setAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null);

  const tokenOptions = [
    { value: 'BNB', label: 'BNB', chain: 'BSC' },
    { value: 'LINK', label: 'LINK', chain: 'BSC' },
    { value: 'USDC', label: 'USDC', chain: 'BSC' },
    { value: 'USDT', label: 'USDT', chain: 'BSC' },
    { value: 'ETH', label: 'ETH', chain: 'Ethereum' },
    { value: 'BTC', label: 'BTC', chain: 'Bitcoin' },
  ];

  const providerInfo = {
    uniswap: {
      name: 'Uniswap',
      description: 'Decentralized exchange for token swaps',
      supports: ['BSC', 'Ethereum'],
      fees: '0.3%',
    },
    wormhole: {
      name: 'Wormhole',
      description: 'Cross-chain bridge for multi-chain swaps',
      supports: ['BSC', 'Ethereum', 'Solana', 'Avalanche'],
      fees: '0.1%',
    },
    'circle-cctp': {
      name: 'Circle CCTP',
      description: 'USDC cross-chain transfers via Circle',
      supports: ['BSC', 'Ethereum', 'Avalanche', 'Base'],
      fees: 'Free',
    },
    'link-to-bnb': {
      name: 'LINK → BNB',
      description: 'Direct swap from LINK to BNB',
      supports: ['BSC'],
      fees: '0.5%',
    },
  };

  const handleSwap = async () => {
    if (!user?.wallet?.address) {
      showAlert('Please connect your wallet first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      showAlert('Please enter a valid amount');
      return;
    }

    setIsSwapping(true);
    setResult(null);

    try {
      let response;
      
      switch (provider) {
        case 'link-to-bnb':
          response = await fetch('/api/swap/link-to-bnb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount,
              walletAddress: user.wallet.address,
            }),
          });
          break;
        
        case 'uniswap':
          response = await fetch('/api/swap/uniswap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tokenIn: fromToken,
              tokenOut: toToken,
              amount,
              chainId: 97, // BSC Testnet
              slippageTolerance: 0.5, // 0.5% default
              recipient: user.wallet.address,
            }),
          });
          break;
        
        case 'wormhole':
          response = await fetch('/api/swap/wormhole', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: fromToken === 'BNB' ? 'native' : fromToken,
              amount,
              sourceChain: 'Bsc', // BSC Testnet
              destinationChain: 'Ethereum', // Can be made configurable
              recipient: user.wallet.address,
              route: 'TokenBridge', // Manual bridge
            }),
          });
          break;
        
        case 'circle-cctp':
          // Circle CCTP only supports USDC
          if (fromToken !== 'USDC' && toToken !== 'USDC') {
            showAlert('Circle CCTP only supports USDC transfers');
            setIsSwapping(false);
            return;
          }
          response = await fetch('/api/swap/circle-cctp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount,
              sourceChain: 'BSC',
              destinationChain: 'Ethereum', // Can be made configurable
              walletAddress: user.wallet.address,
            }),
          });
          break;
        
        default:
          throw new Error('Unsupported swap provider');
      }

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: `Successfully swapped ${amount} ${fromToken} for ${toToken}!`,
          txHash: data.txHash,
        });
        showAlert(`Swap successful! Transaction: ${data.txHash.slice(0, 10)}...`);
      } else {
        setResult({
          success: false,
          message: data.error || 'Swap failed',
        });
        showAlert(data.error || 'Swap failed');
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Swap failed',
      });
      showAlert(error.message || 'Swap failed');
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className={styles.swapContainer}>
      <h2>💱 Token Swap</h2>
      <p className={styles.description}>
        Swap tokens across multiple chains using Uniswap, Wormhole, or Circle CCTP
      </p>

      {/* Provider Selection */}
      <div className={styles.providerSection}>
        <label>
          <strong>Swap Provider:</strong>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as SwapProvider)}
            disabled={isSwapping}
            className={styles.providerSelect}
          >
            <option value="uniswap">Uniswap (DEX)</option>
            <option value="wormhole">Wormhole (Cross-chain)</option>
            <option value="circle-cctp">Circle CCTP (USDC Bridge)</option>
            <option value="link-to-bnb">LINK → BNB (Direct)</option>
          </select>
        </label>
        <div className={styles.providerInfo}>
          <p><strong>{providerInfo[provider].name}</strong></p>
          <p>{providerInfo[provider].description}</p>
          <p>Supports: {providerInfo[provider].supports.join(', ')}</p>
          <p>Fees: {providerInfo[provider].fees}</p>
        </div>
      </div>

      {/* Token Selection */}
      <div className={styles.tokenSection}>
        <div className={styles.inputGroup}>
          <label>
            From Token:
            <select
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value)}
              disabled={isSwapping || provider === 'link-to-bnb'}
              className={styles.tokenSelect}
            >
              {tokenOptions.map((token) => (
                <option key={token.value} value={token.value}>
                  {token.label} ({token.chain})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.swapArrow}>↓</div>

        <div className={styles.inputGroup}>
          <label>
            To Token:
            <select
              value={toToken}
              onChange={(e) => setToToken(e.target.value)}
              disabled={isSwapping || provider === 'link-to-bnb'}
              className={styles.tokenSelect}
            >
              {tokenOptions.map((token) => (
                <option key={token.value} value={token.value}>
                  {token.label} ({token.chain})
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Amount Input */}
      <div className={styles.inputGroup}>
        <label>
          Amount:
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            min="0.1"
            step="0.1"
            disabled={isSwapping}
            className={styles.amountInput}
          />
        </label>
        {provider === 'link-to-bnb' && (
          <p className={styles.hint}>You have 25 LINK tokens available</p>
        )}
      </div>

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={isSwapping || !user?.wallet?.address || !amount}
        className={styles.swapButton}
      >
        {isSwapping ? 'Swapping...' : `Swap ${fromToken} → ${toToken}`}
      </button>

      {/* Result */}
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

      {/* Info */}
      <div className={styles.info}>
        <p>⚠️ <strong>Important:</strong></p>
        <ul>
          <li>Ensure you have enough gas (BNB) for the transaction</li>
          <li>Cross-chain swaps may take several minutes</li>
          <li>Check slippage tolerance before confirming</li>
          <li>Verify token addresses match your network</li>
        </ul>
      </div>
    </div>
  );
}

