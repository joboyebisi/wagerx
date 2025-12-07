'use client';

import { useState, useEffect } from 'react';
import styles from './CharitySelector.module.css';

interface CharitySelectorProps {
  enabled: boolean;
  percentage: number;
  address: string;
  onEnabledChange: (enabled: boolean) => void;
  onPercentageChange: (percentage: number) => void;
  onAddressChange: (address: string) => void;
}

export default function CharitySelector({
  enabled,
  percentage,
  address,
  onEnabledChange,
  onPercentageChange,
  onAddressChange,
}: CharitySelectorProps) {
  const [popularCharities, setPopularCharities] = useState<any[]>([]);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    fetchPopularCharities();
  }, []);

  const fetchPopularCharities = async () => {
    try {
      const response = await fetch('/api/charity');
      if (response.ok) {
        const charities = await response.json();
        setPopularCharities(charities);
      }
    } catch (error) {
      console.error('Failed to fetch charities:', error);
    }
  };

  return (
    <div className={styles.charitySelector}>
      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className={styles.checkbox}
        />
        <span>💝 Donate a percentage of winnings to charity</span>
      </label>

      {enabled && (
        <div className={styles.charityOptions}>
          <div className={styles.percentageInput}>
            <label>Donation Percentage</label>
            <div className={styles.percentageSlider}>
              <input
                type="range"
                min="1"
                max="50"
                value={percentage}
                onChange={(e) => onPercentageChange(parseInt(e.target.value))}
                className={styles.slider}
              />
              <span className={styles.percentageValue}>{percentage}%</span>
            </div>
            <p className={styles.hint}>
              {percentage}% of winnings will be donated to charity
            </p>
          </div>

          <div className={styles.addressInput}>
            <label>Charity Address</label>
            <div className={styles.addressSelector}>
              <input
                type="text"
                value={address}
                onChange={(e) => onAddressChange(e.target.value)}
                placeholder="0x..."
                className={styles.addressField}
              />
              <button
                type="button"
                onClick={() => setShowSelector(!showSelector)}
                className={styles.selectButton}
              >
                Select Popular
              </button>
            </div>

            {showSelector && popularCharities.length > 0 && (
              <div className={styles.charityList}>
                {popularCharities.map((charity, idx) => (
                  <div
                    key={idx}
                    className={styles.charityItem}
                    onClick={() => {
                      onAddressChange(charity.address);
                      setShowSelector(false);
                    }}
                  >
                    <div className={styles.charityName}>{charity.name}</div>
                    <div className={styles.charityDescription}>
                      {charity.description}
                    </div>
                    <div className={styles.charityAddress}>
                      {charity.address.slice(0, 6)}...{charity.address.slice(-4)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {address && (
              <p className={styles.addressHint}>
                Charity will receive {percentage}% of total winnings
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

