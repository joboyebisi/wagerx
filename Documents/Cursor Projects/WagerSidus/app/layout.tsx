import type { Metadata } from 'next';
import './globals.css';
import PrivyProviderWrapper from '@/components/PrivyProviderWrapper';

export const metadata: Metadata = {
  title: 'WagerSidus - Telegram Wager Bot',
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
        <PrivyProviderWrapper>
          {children}
        </PrivyProviderWrapper>
      </body>
    </html>
  );
}

