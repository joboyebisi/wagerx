'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useWagerContract } from '@/lib/hooks/useWagerContract';
import { useTelegram } from '@/lib/hooks/useTelegram';
import { contractService, WagerData } from '@/lib/services/contract';
import { ErrorHandler } from '@/lib/utils/errorHandler';
import { transactionTracker } from '@/lib/utils/transactionTracker';
import { CharityVerificationService } from '@/lib/utils/charityVerification';
import { ethers } from 'ethers';
import InviteParticipants from '@/components/InviteParticipants';
import styles from './page.module.css';

const STATUS_LABELS: Record<number, string> = {
  0: 'Pending',
  1: 'Active',
  2: 'Resolved',
  3: 'Cancelled',
};

const STATUS_COLORS: Record<number, string> = {
  0: '#856404',
  1: '#0c5460',
  2: '#155724',
  3: '#721c24',
};

const STATUS_BG_COLORS: Record<number, string> = {
  0: '#fff3cd',
  1: '#d1ecf1',
  2: '#d4edda',
  3: '#f8d7da',
};

export default function WagerDetailPage() {
  const { user, authenticated } = usePrivy();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { showAlert, showConfirm } = useTelegram();
  const {
    acceptWager,
    resolveWager,
    cancelWager,
    getWager,
    getBalance,
    transactionStatus,
    isLoading,
  } = useWagerContract();

  const wagerId = params.id as string;
  const action = searchParams.get('action'); // 'resolve' or 'cancel'
  const created = searchParams.get('created') === 'true'; // Show success banner

  const [wager, setWager] = useState<WagerData | null>(null);
  const [isLoadingWager, setIsLoadingWager] = useState(true);
  const [balance, setBalance] = useState<string>('0');
  const [isResolving, setIsResolving] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(created);

  // Load wager data
  useEffect(() => {
    if (authenticated && wagerId) {
      loadWager();
      loadBalance();
    }
  }, [authenticated, wagerId]);

  // Auto-trigger actions based on URL params
  useEffect(() => {
    if (!wager || !action) return;

    if (action === 'resolve' && wager.status === 1 && !isResolving) {
      handleResolveClick();
    } else if (action === 'accept' && wager.status === 0 && !isLoading) {
      handleAccept();
    } else if (action === 'cancel' && (wager.status === 0 || wager.status === 1) && !isLoading) {
      handleCancel();
    }
  }, [action, wager, isResolving, isLoading]);

  const loadWager = async () => {
    if (!wagerId) return;

    setIsLoadingWager(true);
    setError(null);
    try {
      const wagerIdBigInt = BigInt(wagerId);
      const wagerData = await getWager(wagerIdBigInt);
      setWager(wagerData);
    } catch (error: any) {
      console.error('Failed to load wager:', error);
      setError(error.message || 'Failed to load wager');
    } finally {
      setIsLoadingWager(false);
    }
  };

  const loadBalance = async () => {
    if (!user?.wallet?.address) return;
    try {
      const bal = await getBalance(user.wallet.address);
      setBalance(bal);
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  // Check if user is a participant
  const isParticipant = (): boolean => {
    if (!wager || !user?.wallet?.address) return false;
    return wager.participants.some(
      (addr) => addr.toLowerCase() === user.wallet?.address?.toLowerCase()
    );
  };

  // Check if user is the creator (first participant)
  const isCreator = (): boolean => {
    if (!wager || !user?.wallet?.address) return false;
    return wager.participants[0]?.toLowerCase() === user.wallet?.address?.toLowerCase();
  };

  // Format BNB amount
  const formatBNB = (amount: bigint): string => {
    return (Number(amount) / 1e18).toFixed(4);
  };

  // Format date
  const formatDate = (timestamp: bigint): string => {
    return new Date(Number(timestamp) * 1000).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle accept wager
  const handleAccept = async () => {
    if (!wager || !user?.wallet?.address) return;

    const amountBNB = formatBNB(wager.amount);
    const hasBalance = parseFloat(balance) >= parseFloat(amountBNB);

    if (!hasBalance) {
      showAlert(`Insufficient balance. You need ${amountBNB} BNB but have ${balance} BNB.`);
      return;
    }

    const confirmed = await showConfirm(`Accept this wager for ${amountBNB} BNB?`);

    if (!confirmed) return;

    try {
      // Step 1: Accept wager on smart contract
      const result = await acceptWager(BigInt(wagerId));

      // Step 2: Update database
      try {
        await fetch(`/api/wagers/${wagerId}/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantAddress: user.wallet.address,
            txHash: result.txHash,
          }),
        });
      } catch (storeError) {
        console.error('Error updating wager in database:', storeError);
      }

      showAlert(`Wager accepted! Transaction: ${result.txHash.slice(0, 10)}...`);
      // Refresh wager data
      setTimeout(() => loadWager(), 2000);
    } catch (error: any) {
      console.error('Failed to accept wager:', error);
      const appError = ErrorHandler.formatError(error, 'AcceptWager');
      ErrorHandler.logError(appError);
      showAlert(appError.userMessage);
    }
  };

  // Handle resolve wager
  const handleResolveClick = async () => {
    if (!wager || isResolving) return;

    setIsResolving(true);
    setError(null);

    try {
      // Step 1: Call AI verification
      showAlert('Verifying wager outcome with AI...');

      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wagerId: wagerId,
          address: user?.wallet?.address,
          category: wager.condition.toLowerCase().includes('bitcoin') ||
            wager.condition.toLowerCase().includes('btc') ||
            wager.condition.toLowerCase().includes('eth') ||
            wager.condition.toLowerCase().includes('crypto')
            ? 'crypto'
            : 'sports',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to verify wager');
      }

      const verification = await response.json();
      setVerificationResult(verification);

      if (!verification.verified || !verification.winner) {
        throw new Error('Could not determine winner. Please resolve manually.');
      }

      // Step 2: Confirm resolution
      const winnerAddress = verification.winner;
      const winnerIndex = wager.participants.findIndex(
        (addr) => addr.toLowerCase() === winnerAddress.toLowerCase()
      );

      if (winnerIndex === -1) {
        throw new Error('Winner address not found in participants');
      }

      const confirmed = await showConfirm(
        `Resolve wager with winner: ${winnerAddress.slice(0, 6)}...${winnerAddress.slice(-4)}?\n\nEvidence: ${verification.evidence}`
      );

      if (!confirmed) {
        setIsResolving(false);
        return;
      }

      // Step 3: Call smart contract
      showAlert('Resolving wager on blockchain...');
      const result = await resolveWager(
        BigInt(wagerId),
        winnerAddress,
        verification.evidence || 'AI verified'
      );

      // Step 4: Update database
      try {
        await fetch(`/api/wagers/${wagerId}/resolve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            winnerAddress: winnerAddress,
            txHash: result.txHash,
            evidence: verification.evidence || 'AI verified',
            charityDonation: verification.charityDonation || null,
          }),
        });
      } catch (storeError) {
        console.error('Error updating wager in database:', storeError);
      }

      showAlert(
        `Wager resolved! Winner: ${winnerAddress.slice(0, 6)}...${winnerAddress.slice(-4)}\nTransaction: ${result.txHash.slice(0, 10)}...`
      );

      // Refresh wager data
      setTimeout(() => loadWager(), 2000);
      // Step 5: Verify charity donation if enabled
      if (wager.charityEnabled) {
        try {
          const charityVerification = await CharityVerificationService.verifyFromContract(
            BigInt(wagerId)
          );
          if (!charityVerification.isValid) {
            console.warn('Charity verification failed:', charityVerification.errors);
          }
        } catch (verifyError) {
          console.error('Error verifying charity donation:', verifyError);
          // Don't fail the whole operation
        }
      }
    } catch (error: any) {
      console.error('Failed to resolve wager:', error);
      const appError = ErrorHandler.formatError(error, 'ResolveWager');
      ErrorHandler.logError(appError);
      setError(appError.userMessage);
      showAlert(appError.userMessage);
    } finally {
      setIsResolving(false);
    }
  };

  // Handle cancel wager
  const handleCancel = async () => {
    if (!wager) return;

    const confirmed = await showConfirm(
      'Are you sure you want to cancel this wager? All participants will be refunded.'
    );

    if (!confirmed) return;

    try {
      const result = await cancelWager(BigInt(wagerId));
      showAlert(`Wager cancelled! Transaction: ${result.txHash.slice(0, 10)}...`);
      // Refresh wager data
      setTimeout(() => loadWager(), 2000);
    } catch (error: any) {
      console.error('Failed to cancel wager:', error);
      const appError = ErrorHandler.formatError(error, 'CancelWager');
      ErrorHandler.logError(appError);
      showAlert(appError.userMessage);
    }
  };

  // Get BSCScan URL
  const getBSCScanUrl = (txHash: string): string => {
    return transactionTracker.getBSCScanUrl(txHash);
  };

  if (!authenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Please connect your wallet to view wager details</div>
      </div>
    );
  }

  if (isLoadingWager) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading wager...</p>
        </div>
      </div>
    );
  }

  if (error || !wager) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          {error || 'Wager not found'}
          <button className={styles.backButton} onClick={() => router.back()}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const status = wager.status;
  const statusLabel = STATUS_LABELS[status] || 'Unknown';
  const statusColor = STATUS_COLORS[status] || '#666';
  const statusBgColor = STATUS_BG_COLORS[status] || '#f5f5f5';
  const canAccept = status === 0 && isParticipant();
  const canResolve = status === 1 && (isCreator() || isParticipant());
  const canCancel = (status === 0 || status === 1) && (isCreator() || isParticipant());

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => router.back()}>
          ← Back
        </button>
        <h1>Wager #{wagerId}</h1>
      </div>

      {/* Success Banner */}
      {showSuccessBanner && (
        <div className={styles.successBanner}>
          <div className={styles.successContent}>
            <span className={styles.successIcon}>✅</span>
            <div>
              <strong>Wager Created Successfully!</strong>
              <p>Share the link below with friends to invite them to join.</p>
            </div>
            <button
              className={styles.closeBanner}
              onClick={() => setShowSuccessBanner(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Status Badge */}
      <div className={styles.statusBadge} style={{ background: statusBgColor, color: statusColor }}>
        {statusLabel}
      </div>

      {/* Wager Details */}
      <div className={styles.details}>
        <div className={styles.detailSection}>
          <h2>Condition</h2>
          <p className={styles.condition}>{wager.condition}</p>
        </div>

        <div className={styles.detailSection}>
          <h2>Amount</h2>
          <p className={styles.amount}>{formatBNB(wager.amount)} BNB</p>
          <p className={styles.totalAmount}>
            Total Pool: {formatBNB(wager.amount * BigInt(wager.participants.length))} BNB
          </p>
        </div>

        <div className={styles.detailSection}>
          <h2>Participants ({wager.participants.length})</h2>
          <div className={styles.participantsList}>
            {wager.participants.map((address, idx) => (
              <div
                key={idx}
                className={`${styles.participantItem} ${
                  address.toLowerCase() === user?.wallet?.address?.toLowerCase()
                    ? styles.participantYou
                    : ''
                }`}
              >
                <span className={styles.participantAddress}>
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                {address.toLowerCase() === user?.wallet?.address?.toLowerCase() && (
                  <span className={styles.youBadge}>(You)</span>
                )}
                {wager.winner && wager.winner.toLowerCase() === address.toLowerCase() && (
                  <span className={styles.winnerBadge}>🏆 Winner</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {wager.charityEnabled && (
          <div className={styles.detailSection}>
            <h2>💝 Charity Donation</h2>
            <p>
              {wager.charityPercentage}% of winnings will be donated to:
            </p>
            <p className={styles.charityAddress}>
              {wager.charityAddress.slice(0, 6)}...{wager.charityAddress.slice(-4)}
            </p>
            {wager.charityDonated > 0 && (
              <p className={styles.charityDonated}>
                Donated: {formatBNB(wager.charityDonated)} BNB
              </p>
            )}
          </div>
        )}

        <div className={styles.detailSection}>
          <h2>Timeline</h2>
          <div className={styles.timeline}>
            <div className={styles.timelineItem}>
              <span className={styles.timelineLabel}>Created:</span>
              <span className={styles.timelineValue}>{formatDate(wager.createdAt)}</span>
            </div>
            {wager.resolvedAt > 0 && (
              <div className={styles.timelineItem}>
                <span className={styles.timelineLabel}>Resolved:</span>
                <span className={styles.timelineValue}>{formatDate(wager.resolvedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {wager.winner && (
          <div className={styles.detailSection}>
            <h2>Winner</h2>
            <p className={styles.winnerAddress}>
              {wager.winner.slice(0, 6)}...{wager.winner.slice(-4)}
            </p>
          </div>
        )}
      </div>

      {/* Transaction Status */}
      {transactionStatus.status !== 'idle' && (
        <div className={styles.transactionStatus}>
          {transactionStatus.status === 'pending' && (
            <div className={styles.statusPending}>
              ⏳ Transaction pending...
              {transactionStatus.txHash && (
                <a
                  href={getBSCScanUrl(transactionStatus.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.txLink}
                >
                  View on BSCScan
                </a>
              )}
            </div>
          )}
          {transactionStatus.status === 'success' && transactionStatus.txHash && (
            <div className={styles.statusSuccess}>
              ✅ Transaction confirmed!
              <a
                href={getBSCScanUrl(transactionStatus.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.txLink}
              >
                View on BSCScan
              </a>
            </div>
          )}
          {transactionStatus.status === 'error' && transactionStatus.error && (
            <div className={styles.statusError}>❌ {transactionStatus.error}</div>
          )}
        </div>
      )}

      {/* Verification Result */}
      {verificationResult && (
        <div className={styles.verificationResult}>
          <h3>Verification Result</h3>
          <p>
            <strong>Winner:</strong> {verificationResult.winner?.slice(0, 6)}...
            {verificationResult.winner?.slice(-4)}
          </p>
          <p>
            <strong>Evidence:</strong> {verificationResult.evidence}
          </p>
          <p>
            <strong>Confidence:</strong> {(verificationResult.confidence * 100).toFixed(1)}%
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && <div className={styles.errorMessage}>{error}</div>}

      {/* Invite & Share Section */}
      {wager.status === 0 && wager.participants[0]?.toLowerCase() === user?.wallet?.address?.toLowerCase() && (
        <div className={styles.inviteSection}>
          <h3>👥 Invite Participants</h3>
          <p className={styles.inviteDescription}>
            Share this link or add participants by wallet address or Telegram username
          </p>
          <InviteParticipants wagerId={wagerId} currentParticipants={wager.participants} />
        </div>
      )}

      {/* Share Wager Section */}
      <div className={styles.shareSection}>
        <h3>🔗 Share This Wager</h3>
        <div className={styles.shareButtons}>
          <button
            className={styles.shareButton}
            onClick={async () => {
              const url = `${window.location.origin}/wagers/${wagerId}`;
              try {
                await navigator.clipboard.writeText(url);
                showAlert('Link copied to clipboard!');
              } catch {
                showAlert(`Share this link: ${url}`);
              }
            }}
          >
            📋 Copy Link
          </button>
          <button
            className={styles.shareButton}
            onClick={() => {
              const url = `${window.location.origin}/wagers/${wagerId}`;
              const message = `🎲 Join this wager!\n\n${wager.condition}\n💰 ${formatBNB(wager.amount)} BNB\n\n${url}`;
              const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`;
              window.open(telegramUrl, '_blank');
            }}
          >
            📱 Share on Telegram
          </button>
          {navigator.share && (
            <button
              className={styles.shareButton}
              onClick={async () => {
                try {
                  await navigator.share({
                    title: `Wager #${wagerId}`,
                    text: `Join this wager: ${wager.condition} - ${formatBNB(wager.amount)} BNB`,
                    url: `${window.location.origin}/wagers/${wagerId}`,
                  });
                } catch (error) {
                  // User cancelled
                }
              }}
            >
              📤 Share
            </button>
          )}
        </div>
        <p className={styles.shareHint}>
          Share this link with friends to invite them to join the wager!
        </p>
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        {canAccept && (
          <button
            className={styles.actionButton}
            onClick={handleAccept}
            disabled={isLoading || transactionStatus.status === 'pending'}
          >
            Accept Wager ({formatBNB(wager.amount)} BNB)
          </button>
        )}

        {canResolve && (
          <button
            className={styles.actionButton}
            onClick={handleResolveClick}
            disabled={isLoading || isResolving || transactionStatus.status === 'pending'}
          >
            {isResolving ? 'Resolving...' : 'Resolve Wager'}
          </button>
        )}

        {canCancel && (
          <button
            className={styles.actionButtonDanger}
            onClick={handleCancel}
            disabled={isLoading || transactionStatus.status === 'pending'}
          >
            Cancel Wager
          </button>
        )}

        {status === 2 && (
          <div className={styles.resolvedInfo}>
            <p>✅ This wager has been resolved.</p>
            {wager.winner && (
              <p>
                Winner: {wager.winner.slice(0, 6)}...{wager.winner.slice(-4)}
              </p>
            )}
          </div>
        )}

        {status === 3 && (
          <div className={styles.cancelledInfo}>
            <p>❌ This wager has been cancelled.</p>
            <p>All participants have been refunded.</p>
          </div>
        )}
      </div>

      {/* Balance Info */}
      <div className={styles.balanceInfo}>
        Your Balance: <strong>{parseFloat(balance).toFixed(4)} BNB</strong>
      </div>
    </div>
  );
}

