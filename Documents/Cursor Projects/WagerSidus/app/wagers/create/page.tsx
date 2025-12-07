'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useWagerContract } from '@/lib/hooks/useWagerContract';
import { WagerIntent } from '@/lib/services/perplexity';
import CharitySelector from '@/components/CharitySelector';
import { useTelegram } from '@/lib/hooks/useTelegram';
import styles from './page.module.css';

export default function CreateWagerPage() {
  const { user, authenticated } = usePrivy();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showAlert } = useTelegram();
  const {
    createWager,
    getBalance,
    transactionStatus,
    isLoading,
  } = useWagerContract();

  // Form state
  const [participants, setParticipants] = useState<string[]>([]);
  const [participantInput, setParticipantInput] = useState('');
  const [amount, setAmount] = useState('');
  const [condition, setCondition] = useState('');
  const [category, setCategory] = useState<'sports' | 'crypto'>('sports');
  const [charityEnabled, setCharityEnabled] = useState(false);
  const [charityPercentage, setCharityPercentage] = useState(5);
  const [charityAddress, setCharityAddress] = useState('');
  const [balance, setBalance] = useState<string>('0');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load intent from URL params if available
  useEffect(() => {
    const intentParam = searchParams.get('intent');
    const messageParam = searchParams.get('message');

    if (intentParam) {
      try {
        const intent: WagerIntent = JSON.parse(decodeURIComponent(intentParam));
        if (intent.type === 'create') {
          // Pre-fill form from intent
          if (intent.amount) setAmount(intent.amount);
          if (intent.condition) setCondition(intent.condition);
          if (intent.category) setCategory(intent.category);
          if (intent.participants && intent.participants.length > 0) {
            // Ensure current user is included
            const allParticipants = intent.participants.includes(user?.wallet?.address || '')
              ? intent.participants
              : [user?.wallet?.address || '', ...intent.participants].filter(Boolean);
            setParticipants(allParticipants);
          } else if (user?.wallet?.address) {
            // Default to current user as first participant
            setParticipants([user.wallet.address]);
          }
          if (intent.charityEnabled) {
            setCharityEnabled(true);
            if (intent.charityPercentage) setCharityPercentage(intent.charityPercentage);
            if (intent.charityAddress) setCharityAddress(intent.charityAddress);
          }
        }
      } catch (error) {
        console.error('Failed to parse intent:', error);
      }
    } else if (user?.wallet?.address) {
      // Default to current user as first participant
      setParticipants([user.wallet.address]);
    }

    // Use message as condition if no intent condition
    if (messageParam && !condition) {
      setCondition(decodeURIComponent(messageParam));
    }
  }, [searchParams, user, condition]);

  // Load balance
  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      loadBalance();
    }
  }, [authenticated, user]);

  const loadBalance = async () => {
    if (!user?.wallet?.address) return;
    try {
      const bal = await getBalance(user.wallet.address);
      setBalance(bal);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Ensure current user is included
    if (user?.wallet?.address && !participants.includes(user.wallet.address)) {
      setParticipants([user.wallet.address, ...participants]);
    }

    if (participants.length < 2) {
      newErrors.participants = 'At least 2 participants are required';
    }

    // Validate participant addresses
    participants.forEach((addr, idx) => {
      if (!addr || !addr.match(/^0x[a-fA-F0-9]{40}$/)) {
        newErrors[`participant_${idx}`] = 'Invalid address';
      }
    });

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (parseFloat(amount) > parseFloat(balance)) {
      newErrors.amount = 'Insufficient balance';
    }

    if (!condition.trim()) {
      newErrors.condition = 'Condition is required';
    }

    if (charityEnabled) {
      if (charityPercentage < 1 || charityPercentage > 50) {
        newErrors.charityPercentage = 'Charity percentage must be between 1% and 50%';
      }
      if (!charityAddress || !charityAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        newErrors.charityAddress = 'Valid charity address is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Add participant
  const handleAddParticipant = () => {
    const addr = participantInput.trim();
    if (addr && addr.match(/^0x[a-fA-F0-9]{40}$/)) {
      if (!participants.includes(addr)) {
        setParticipants([...participants, addr]);
        setParticipantInput('');
        setErrors({ ...errors, participants: '' });
      } else {
        setErrors({ ...errors, participants: 'Address already added' });
      }
    } else {
      setErrors({ ...errors, participants: 'Invalid address format' });
    }
  };

  // Remove participant
  const handleRemoveParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showAlert('Please fix the errors in the form');
      return;
    }

    if (!user?.wallet?.address) {
      showAlert('Please connect your wallet');
      return;
    }

    try {
      // Step 1: Create wager on smart contract
      const result = await createWager({
        participants,
        amount,
        condition,
        charityEnabled,
        charityPercentage: charityEnabled ? charityPercentage : undefined,
        charityAddress: charityEnabled ? charityAddress : undefined,
      });

      // Step 2: Store wager in database
      try {
        const storeResponse = await fetch('/api/wagers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wagerId: result.wagerId.toString(),
            txHash: result.txHash,
            creatorAddress: user.wallet.address,
            participants,
            amount,
            condition,
            category: category,
            charityEnabled,
            charityPercentage: charityEnabled ? charityPercentage : undefined,
            charityAddress: charityEnabled ? charityAddress : undefined,
            contractAddress: process.env.NEXT_PUBLIC_WAGER_CONTRACT_ADDRESS,
          }),
        });

        if (!storeResponse.ok) {
          console.warn('Failed to store wager in database, but contract creation succeeded');
        }
      } catch (storeError) {
        console.error('Error storing wager:', storeError);
        // Don't fail the whole operation if storage fails
      }

      // Show success message
      const wagerUrl = `${window.location.origin}/wagers/${result.wagerId.toString()}`;
      const shareMessage = `✅ Wager Created Successfully!

📋 Wager ID: #${result.wagerId}
💰 Amount: ${amount} BNB
📝 Condition: ${condition}
👥 Participants: ${participants.length}

🔗 Share this link:
${wagerUrl}

You'll be redirected to view your wager...`;

      showAlert(shareMessage);

      // Redirect to wager detail page (success banner will show there)
      setTimeout(() => {
        router.push(`/wagers/${result.wagerId.toString()}?created=true`);
      }, 1500);
    } catch (error: any) {
      console.error('Failed to create wager:', error);
      showAlert(error.message || 'Failed to create wager. Please try again.');
    }
  };

  if (!authenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Please connect your wallet to create a wager</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Create New Wager</h1>
        <p className={styles.subtitle}>Set up a wager with friends on sports or crypto</p>
      </div>

      <div className={styles.balanceInfo}>
        <span>Your Balance: </span>
        <strong>{parseFloat(balance).toFixed(4)} BNB</strong>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Category Selection */}
        <div className={styles.formGroup}>
          <label>Category</label>
          <div className={styles.categorySelector}>
            <button
              type="button"
              className={`${styles.categoryButton} ${category === 'sports' ? styles.active : ''}`}
              onClick={() => setCategory('sports')}
            >
              🏀 Sports
            </button>
            <button
              type="button"
              className={`${styles.categoryButton} ${category === 'crypto' ? styles.active : ''}`}
              onClick={() => setCategory('crypto')}
            >
              💰 Crypto
            </button>
          </div>
        </div>

        {/* Condition */}
        <div className={styles.formGroup}>
          <label htmlFor="condition">Wager Condition *</label>
          <textarea
            id="condition"
            value={condition}
            onChange={(e) => {
              setCondition(e.target.value);
              setErrors({ ...errors, condition: '' });
            }}
            placeholder="e.g., Lakers beat Warriors on December 15th"
            rows={3}
            className={errors.condition ? styles.errorInput : ''}
          />
          {errors.condition && <span className={styles.errorText}>{errors.condition}</span>}
        </div>

        {/* Amount */}
        <div className={styles.formGroup}>
          <label htmlFor="amount">Amount (BNB) *</label>
          <input
            id="amount"
            type="number"
            step="0.001"
            min="0.001"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setErrors({ ...errors, amount: '' });
            }}
            placeholder="0.01"
            className={errors.amount ? styles.errorInput : ''}
          />
          {errors.amount && <span className={styles.errorText}>{errors.amount}</span>}
          {amount && parseFloat(amount) > parseFloat(balance) && (
            <span className={styles.warningText}>
              ⚠️ Insufficient balance. You need {parseFloat(amount).toFixed(4)} BNB
            </span>
          )}
        </div>

        {/* Participants */}
        <div className={styles.formGroup}>
          <label>Participants *</label>
          <div className={styles.participantInput}>
            <input
              type="text"
              value={participantInput}
              onChange={(e) => setParticipantInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddParticipant();
                }
              }}
              placeholder="0x..."
              className={errors.participants ? styles.errorInput : ''}
            />
            <button type="button" onClick={handleAddParticipant} className={styles.addButton}>
              Add
            </button>
          </div>
          {errors.participants && <span className={styles.errorText}>{errors.participants}</span>}

          {/* Participant list */}
          {participants.length > 0 && (
            <div className={styles.participantList}>
              {participants.map((addr, idx) => (
                <div key={idx} className={styles.participantItem}>
                  <span className={styles.participantAddress}>
                    {addr.slice(0, 6)}...{addr.slice(-4)}
                    {addr === user?.wallet?.address && ' (You)'}
                  </span>
                  {addr !== user?.wallet?.address && (
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(idx)}
                      className={styles.removeButton}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Charity Options */}
        <CharitySelector
          enabled={charityEnabled}
          percentage={charityPercentage}
          address={charityAddress}
          onEnabledChange={setCharityEnabled}
          onPercentageChange={setCharityPercentage}
          onAddressChange={setCharityAddress}
        />
        {errors.charityPercentage && (
          <span className={styles.errorText}>{errors.charityPercentage}</span>
        )}
        {errors.charityAddress && (
          <span className={styles.errorText}>{errors.charityAddress}</span>
        )}

        {/* Transaction Status */}
        {transactionStatus.status === 'pending' && (
          <div className={styles.statusInfo}>
            <div className={styles.loading}>⏳ Transaction pending...</div>
          </div>
        )}
        {transactionStatus.status === 'success' && transactionStatus.txHash && (
          <div className={styles.statusInfo}>
            <div className={styles.success}>
              ✅ Transaction confirmed: {transactionStatus.txHash.slice(0, 10)}...
            </div>
          </div>
        )}
        {transactionStatus.status === 'error' && transactionStatus.error && (
          <div className={styles.statusInfo}>
            <div className={styles.error}>{transactionStatus.error}</div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || transactionStatus.status === 'pending'}
          className={styles.submitButton}
        >
          {isLoading ? 'Creating...' : 'Create Wager'}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className={styles.cancelButton}
        >
          Cancel
        </button>
      </form>
    </div>
  );
}

