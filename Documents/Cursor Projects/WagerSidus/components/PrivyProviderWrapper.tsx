'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { useEffect } from 'react';
import { initWalletConflictFix } from '@/lib/utils/walletConflictFix';

export default function PrivyProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  // Fix wallet injection conflicts early
  useEffect(() => {
    initWalletConflictFix();
  }, []);
  
  // During build, if app ID is not available, just render children
  if (!appId) {
    if (typeof window === 'undefined') {
      return <>{children}</>;
    }
    // In browser, show error or fallback
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Privy App ID not configured. Please set NEXT_PUBLIC_PRIVY_APP_ID.</p>
        {children}
      </div>
    );
  }

  // Define BNB Chain Testnet configuration
  const bnbTestnet = {
    id: parseInt(process.env.NEXT_PUBLIC_BNB_CHAIN_ID || '97'),
    name: 'BNB Smart Chain Testnet',
    network: 'bsc-testnet',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com/'],
      },
    },
  };

  return (
    <PrivyProvider
      appId={appId}
      config={{
        // Prioritize existing wallets (MetaMask, WalletConnect, etc.) - RECOMMENDED
        loginMethods: ['wallet', 'email', 'sms'],
        appearance: {
          theme: 'light',
          accentColor: '#0088cc',
          walletList: ['metamask', 'wallet_connect', 'coinbase_wallet', 'rainbow'],
          showWalletLoginFirst: true, // Show wallet login as primary option
        },
        embeddedWallets: {
          // Only create embedded wallet if user doesn't have one
          createOnLogin: 'users-without-wallets',
        },
        // Chain configuration - defaultChain must be in supportedChains
        defaultChain: bnbTestnet,
        supportedChains: [bnbTestnet], // Include defaultChain in supportedChains
      }}
    >
      {children}
    </PrivyProvider>
  );
}

