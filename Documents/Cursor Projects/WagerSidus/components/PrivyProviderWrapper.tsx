'use client';

import { PrivyProvider } from '@privy-io/react-auth';

export default function PrivyProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  
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

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['wallet', 'email', 'sms'],
        appearance: {
          theme: 'light',
          accentColor: '#0088cc',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}

