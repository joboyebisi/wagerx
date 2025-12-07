/**
 * Utility functions for sharing wagers
 * Creates shareable links for web and Telegram
 */

export interface ShareOptions {
  wagerId: string;
  condition: string;
  amount: string;
  participants: string[];
  appUrl?: string;
}

/**
 * Generate shareable web URL for a wager
 */
export function getWagerWebUrl(wagerId: string, appUrl?: string): string {
  const baseUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${baseUrl}/wagers/${wagerId}`;
}

/**
 * Generate Telegram share message with link
 */
export function getTelegramShareMessage(options: ShareOptions): string {
  const { wagerId, condition, amount, participants } = options;
  const wagerUrl = getWagerWebUrl(wagerId, options.appUrl);
  
  return `🎲 **New Wager Created!**

📋 Wager ID: #${wagerId}
💰 Amount: ${amount} BNB
📝 Condition: ${condition}
👥 Participants: ${participants.length}

🔗 Join this wager:
${wagerUrl}

Click the link to view and accept!`;
}

/**
 * Generate web share data for Web Share API
 */
export function getWebShareData(options: ShareOptions): ShareData {
  const { wagerId, condition, amount } = options;
  const wagerUrl = getWagerWebUrl(wagerId, options.appUrl);
  
  return {
    title: `Wager #${wagerId} - ${condition}`,
    text: `Join this wager: ${amount} BNB on "${condition}"`,
    url: wagerUrl,
  };
}

/**
 * Copy wager link to clipboard
 */
export async function copyWagerLink(wagerId: string, appUrl?: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  const url = getWagerWebUrl(wagerId, appUrl);
  
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackError) {
      console.error('Failed to copy link:', fallbackError);
      return false;
    }
  }
}

/**
 * Share via Web Share API (mobile browsers)
 */
export async function shareWagerNative(options: ShareOptions): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.share) {
    return false;
  }
  
  try {
    const shareData = getWebShareData(options);
    await navigator.share(shareData);
    return true;
  } catch (error: any) {
    // User cancelled or error
    if (error.name !== 'AbortError') {
      console.error('Share failed:', error);
    }
    return false;
  }
}

/**
 * Share via Telegram (opens Telegram with pre-filled message)
 */
export function shareWagerTelegram(options: ShareOptions): void {
  if (typeof window === 'undefined') return;
  
  const message = getTelegramShareMessage(options);
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(getWagerWebUrl(options.wagerId, options.appUrl))}&text=${encodeURIComponent(message)}`;
  
  window.open(telegramUrl, '_blank');
}

