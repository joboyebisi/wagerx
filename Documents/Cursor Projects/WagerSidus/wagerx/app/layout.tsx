import type { Metadata } from 'next';
import './globals.css';
import PrivyProviderWrapper from '@/components/PrivyProviderWrapper';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'WagerX - Telegram Wager Bot',
  description: 'Wager with friends using natural language on BNB Chain',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Prevent wallet injection conflicts - runs before any other scripts */}
        <Script
          id="wallet-conflict-fix"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;
                const originalDefineProperty = Object.defineProperty;
                Object.defineProperty = function(obj, prop, descriptor) {
                  if (prop === 'ethereum' && obj === window && window.ethereum) {
                    try {
                      if (descriptor.value) {
                        Object.assign(window.ethereum, descriptor.value);
                      }
                      return window.ethereum;
                    } catch (e) {
                      return window.ethereum;
                    }
                  }
                  return originalDefineProperty.call(this, obj, prop, descriptor);
                };
              })();
            `,
          }}
        />
        <PrivyProviderWrapper>
          {children}
        </PrivyProviderWrapper>
      </body>
    </html>
  );
}

