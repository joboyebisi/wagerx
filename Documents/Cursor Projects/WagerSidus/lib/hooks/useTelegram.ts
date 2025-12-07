'use client';

import { useEffect, useState } from 'react';
// Dynamic import to avoid SSR issues - only import on client side
let WebApp: any = null;

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramTheme {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [theme, setTheme] = useState<TelegramTheme>({});
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsReady(true);
      return;
    }

    // Dynamically import Telegram SDK only on client side
    if (!WebApp) {
      try {
        WebApp = require('@twa-dev/sdk').default;
      } catch (error) {
        console.warn('Telegram SDK not available:', error);
        setIsReady(true);
        return;
      }
    }

    const tg = window.Telegram?.WebApp;
    if (!tg) {
      // Not in Telegram, continue without Telegram features
      setIsReady(true);
      return;
    }

    // Initialize Telegram WebApp (only if available)
    if (WebApp) {
      WebApp.ready();
      WebApp.expand();
    }

    // Get user info
    const initData = tg.initDataUnsafe;
    if (initData?.user) {
      setUser({
        id: initData.user.id,
        first_name: initData.user.first_name,
        last_name: initData.user.last_name,
        username: initData.user.username,
        language_code: initData.user.language_code,
        is_premium: initData.user.is_premium,
      });
    }

    // Get theme
    const themeParams = tg.themeParams;
    setTheme({
      bg_color: themeParams.bg_color,
      text_color: themeParams.text_color,
      hint_color: themeParams.hint_color,
      link_color: themeParams.link_color,
      button_color: themeParams.button_color,
      button_text_color: themeParams.button_text_color,
      secondary_bg_color: themeParams.secondary_bg_color,
    });

    // Apply theme to CSS variables
    if (themeParams.bg_color) {
      document.documentElement.style.setProperty('--tg-theme-bg-color', themeParams.bg_color);
    }
    if (themeParams.text_color) {
      document.documentElement.style.setProperty('--tg-theme-text-color', themeParams.text_color);
    }
    if (themeParams.button_color) {
      document.documentElement.style.setProperty('--tg-theme-button-color', themeParams.button_color);
    }
    if (themeParams.button_text_color) {
      document.documentElement.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color);
    }

    setIsExpanded(tg.isExpanded);
    setIsReady(true);

    // Handle back button
    tg.BackButton.onClick(() => {
      window.history.back();
    });

    // Show back button when needed
    const handleHistoryChange = () => {
      if (window.history.length > 1) {
        tg.BackButton.show();
      } else {
        tg.BackButton.hide();
      }
    };

    window.addEventListener('popstate', handleHistoryChange);
    handleHistoryChange();

    // Handle viewport changes
    tg.onEvent('viewportChanged', () => {
      setIsExpanded(tg.isExpanded);
    });

    return () => {
      window.removeEventListener('popstate', handleHistoryChange);
    };
  }, []);

  const showAlert = (message: string) => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      // Try showAlert first (older versions), fallback to showPopup or browser alert
      if (typeof tg.showAlert === 'function') {
        tg.showAlert(message);
      } else if (typeof tg.showPopup === 'function') {
        // Use showPopup if showAlert is not available
        tg.showPopup({
          title: 'Notification',
          message: message,
          buttons: [{ type: 'ok' }],
        });
      } else {
        // Fallback to browser alert
        alert(message);
      }
    } else {
      alert(message);
    }
  };

  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        // Try showConfirm first, fallback to showPopup or browser confirm
        if (typeof tg.showConfirm === 'function') {
          tg.showConfirm(message, (confirmed: boolean) => {
            resolve(confirmed);
          });
        } else if (typeof tg.showPopup === 'function') {
          // Use showPopup for confirmation
          tg.showPopup({
            title: 'Confirm',
            message: message,
            buttons: [
              { type: 'ok', id: 'confirm' },
              { type: 'cancel', id: 'cancel' },
            ],
          }, (buttonId: string) => {
            resolve(buttonId === 'confirm');
          });
        } else {
          resolve(confirm(message));
        }
      } else {
        resolve(confirm(message));
      }
    });
  };

  const openLink = (url: string, options?: { try_instant_view?: boolean }) => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openLink(url, options);
    } else {
      window.open(url, '_blank');
    }
  };

  const close = () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.close();
    }
  };

  return {
    isReady,
    isTelegram: typeof window !== 'undefined' && !!window.Telegram?.WebApp,
    user,
    theme,
    isExpanded,
    showAlert,
    showConfirm,
    openLink,
    close,
  };
}

