/**
 * Utility to fix wallet injection conflicts
 * Prevents "Cannot redefine property: ethereum" errors
 * 
 * This happens when multiple wallet extensions (MetaMask, Polkadot.js, etc.)
 * try to inject the ethereum object at the same time
 */

export function fixWalletConflicts() {
  if (typeof window === 'undefined') return;

  // Store original defineProperty
  const originalDefineProperty = Object.defineProperty;

  // Wrap defineProperty to handle ethereum injection gracefully
  Object.defineProperty = function (obj: any, prop: string, descriptor: PropertyDescriptor) {
    // If trying to define 'ethereum' and it already exists, merge instead of redefining
    if (prop === 'ethereum' && obj === window && window.ethereum) {
      try {
        // Merge properties instead of redefining
        if (descriptor.value) {
          Object.assign(window.ethereum, descriptor.value);
        }
        if (descriptor.get) {
          // Keep existing getter, but allow new properties
          const existingValue = window.ethereum;
          Object.keys(descriptor.value || {}).forEach((key) => {
            if (!(key in existingValue)) {
              (window.ethereum as any)[key] = (descriptor.value as any)[key];
            }
          });
        }
        return window.ethereum;
      } catch (error) {
        // If merge fails, just return existing ethereum
        console.warn('Wallet injection conflict resolved:', error);
        return window.ethereum;
      }
    }

    // For all other properties, use original defineProperty
    return originalDefineProperty.call(this, obj, prop, descriptor);
  };
}

/**
 * Initialize wallet conflict fixes
 * Call this early in the app lifecycle
 */
export function initWalletConflictFix() {
  if (typeof window === 'undefined') return;

  // Only run once
  if ((window as any).__walletConflictFixApplied) return;
  (window as any).__walletConflictFixApplied = true;

  // Apply fix
  fixWalletConflicts();

  // Also handle ethereum provider conflicts
  if (window.ethereum && !window.ethereum.providers) {
    // Some wallets don't set providers array, create it
    if (Array.isArray(window.ethereum)) {
      (window as any).ethereum = {
        providers: window.ethereum,
        ...window.ethereum[0],
      };
    }
  }
}

