'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useTelegram } from '@/lib/hooks/useTelegram';
import styles from './page.module.css';

type WagerStatus = 'pending' | 'active' | 'resolved' | 'cancelled' | 'all';

interface Wager {
  id: string | number | bigint;
  status: WagerStatus;
  condition: string;
  amount: string | number;
  participants: string[];
  createdAt?: string | number;
  resolvedAt?: string | number;
  winner?: string;
  category?: 'sports' | 'crypto';
  charityEnabled?: boolean;
  charityPercentage?: number;
}

export default function WagersPage() {
  const { user, authenticated } = usePrivy();
  const router = useRouter();
  const { showAlert } = useTelegram();
  const [wagers, setWagers] = useState<Wager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<WagerStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'sports' | 'crypto'>('all');

  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      loadWagers();
    }
  }, [authenticated, user]);

  const loadWagers = async () => {
    if (!user?.wallet?.address) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/wagers?address=${user.wallet.address}`);
      if (response.ok) {
        const data = await response.json();
        // Ensure data is an array
        const wagersArray = Array.isArray(data) ? data : [];
        setWagers(wagersArray);
      } else {
        throw new Error('Failed to load wagers');
      }
    } catch (error) {
      console.error('Failed to load wagers:', error);
      showAlert('Failed to load wagers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and search wagers
  const filteredWagers = useMemo(() => {
    return wagers.filter((wager) => {
      // Status filter
      if (statusFilter !== 'all' && wager.status !== statusFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && wager.category !== categoryFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesCondition = wager.condition?.toLowerCase().includes(query);
        const matchesId = wager.id?.toString().toLowerCase().includes(query);
        const matchesParticipant = wager.participants?.some((addr) =>
          addr.toLowerCase().includes(query)
        );
        if (!matchesCondition && !matchesId && !matchesParticipant) {
          return false;
        }
      }

      return true;
    });
  }, [wagers, statusFilter, categoryFilter, searchQuery]);

  // Group wagers by status for better organization
  const groupedWagers = useMemo(() => {
    const groups: Record<string, Wager[]> = {
      active: [],
      pending: [],
      resolved: [],
      cancelled: [],
    };

    filteredWagers.forEach((wager) => {
      if (wager.status && groups[wager.status]) {
        groups[wager.status].push(wager);
      }
    });

    return groups;
  }, [filteredWagers]);

  // Format amount
  const formatAmount = (amount: string | number): string => {
    if (typeof amount === 'string') {
      const num = parseFloat(amount);
      return isNaN(num) ? amount : num.toFixed(4);
    }
    // If it's a bigint or number, convert to BNB
    const num = typeof amount === 'bigint' ? Number(amount) / 1e18 : Number(amount) / 1e18;
    return num.toFixed(4);
  };

  // Format date
  const formatDate = (timestamp: string | number | undefined): string => {
    if (!timestamp) return 'N/A';
    const date = typeof timestamp === 'string' 
      ? new Date(timestamp) 
      : new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get status badge class
  const getStatusClass = (status: string): string => {
    return styles[`status_${status}`] || styles.status_default;
  };

  // Get status label
  const getStatusLabel = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (!authenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Please connect your wallet to view wagers</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>My Wagers</h1>
        <p className={styles.subtitle}>View and manage your wagers</p>
      </div>

      {/* Filters and Search */}
      <div className={styles.filters}>
        {/* Search */}
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search wagers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* Status Filter */}
        <div className={styles.filterGroup}>
          <label>Status:</label>
          <div className={styles.filterButtons}>
            {(['all', 'pending', 'active', 'resolved', 'cancelled'] as WagerStatus[]).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  className={`${styles.filterButton} ${
                    statusFilter === status ? styles.filterButtonActive : ''
                  }`}
                  onClick={() => setStatusFilter(status)}
                >
                  {getStatusLabel(status)}
                </button>
              )
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div className={styles.filterGroup}>
          <label>Category:</label>
          <div className={styles.filterButtons}>
            {(['all', 'sports', 'crypto'] as const).map((category) => (
              <button
                key={category}
                type="button"
                className={`${styles.filterButton} ${
                  categoryFilter === category ? styles.filterButtonActive : ''
                }`}
                onClick={() => setCategoryFilter(category)}
              >
                {category === 'all' ? 'All' : category === 'sports' ? '🏀 Sports' : '💰 Crypto'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Wagers List */}
      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading wagers...</p>
        </div>
      ) : filteredWagers.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <h2>No wagers found</h2>
          <p>
            {wagers.length === 0
              ? "You haven't created or joined any wagers yet."
              : 'No wagers match your filters.'}
          </p>
          {wagers.length === 0 && (
            <button
              className={styles.createButton}
              onClick={() => router.push('/wagers/create')}
            >
              Create Your First Wager
            </button>
          )}
        </div>
      ) : (
        <div className={styles.wagersList}>
          {/* Show grouped wagers if no filters, otherwise show filtered list */}
          {statusFilter === 'all' && categoryFilter === 'all' && !searchQuery ? (
            // Grouped view
            <>
              {groupedWagers.active.length > 0 && (
                <div className={styles.statusGroup}>
                  <h2 className={styles.statusGroupTitle}>
                    Active ({groupedWagers.active.length})
                  </h2>
                  <div className={styles.wagerCards}>
                    {groupedWagers.active.map((wager) => (
                      <WagerCard
                        key={wager.id}
                        wager={wager}
                        formatAmount={formatAmount}
                        formatDate={formatDate}
                        getStatusClass={getStatusClass}
                        getStatusLabel={getStatusLabel}
                        onClick={() => router.push(`/wagers/${wager.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {groupedWagers.pending.length > 0 && (
                <div className={styles.statusGroup}>
                  <h2 className={styles.statusGroupTitle}>
                    Pending ({groupedWagers.pending.length})
                  </h2>
                  <div className={styles.wagerCards}>
                    {groupedWagers.pending.map((wager) => (
                      <WagerCard
                        key={wager.id}
                        wager={wager}
                        formatAmount={formatAmount}
                        formatDate={formatDate}
                        getStatusClass={getStatusClass}
                        getStatusLabel={getStatusLabel}
                        onClick={() => router.push(`/wagers/${wager.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {groupedWagers.resolved.length > 0 && (
                <div className={styles.statusGroup}>
                  <h2 className={styles.statusGroupTitle}>
                    Resolved ({groupedWagers.resolved.length})
                  </h2>
                  <div className={styles.wagerCards}>
                    {groupedWagers.resolved.map((wager) => (
                      <WagerCard
                        key={wager.id}
                        wager={wager}
                        formatAmount={formatAmount}
                        formatDate={formatDate}
                        getStatusClass={getStatusClass}
                        getStatusLabel={getStatusLabel}
                        onClick={() => router.push(`/wagers/${wager.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {groupedWagers.cancelled.length > 0 && (
                <div className={styles.statusGroup}>
                  <h2 className={styles.statusGroupTitle}>
                    Cancelled ({groupedWagers.cancelled.length})
                  </h2>
                  <div className={styles.wagerCards}>
                    {groupedWagers.cancelled.map((wager) => (
                      <WagerCard
                        key={wager.id}
                        wager={wager}
                        formatAmount={formatAmount}
                        formatDate={formatDate}
                        getStatusClass={getStatusClass}
                        getStatusLabel={getStatusLabel}
                        onClick={() => router.push(`/wagers/${wager.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Filtered view
            <div className={styles.wagerCards}>
              {filteredWagers.map((wager) => (
                <WagerCard
                  key={wager.id}
                  wager={wager}
                  formatAmount={formatAmount}
                  formatDate={formatDate}
                  getStatusClass={getStatusClass}
                  getStatusLabel={getStatusLabel}
                  onClick={() => router.push(`/wagers/${wager.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Button */}
      <div className={styles.footer}>
        <button
          className={styles.createButton}
          onClick={() => router.push('/wagers/create')}
        >
          + Create New Wager
        </button>
      </div>
    </div>
  );
}

// Wager Card Component
interface WagerCardProps {
  wager: Wager;
  formatAmount: (amount: string | number) => string;
  formatDate: (timestamp: string | number | undefined) => string;
  getStatusClass: (status: string) => string;
  getStatusLabel: (status: string) => string;
  onClick: () => void;
}

function WagerCard({
  wager,
  formatAmount,
  formatDate,
  getStatusClass,
  getStatusLabel,
  onClick,
}: WagerCardProps) {
  return (
    <div className={styles.wagerCard} onClick={onClick}>
      <div className={styles.wagerHeader}>
        <div className={styles.wagerId}>
          #{typeof wager.id === 'bigint' 
            ? wager.id.toString() 
            : typeof wager.id === 'number' 
              ? wager.id.toString().slice(-8)
              : String(wager.id).slice(-8)}
        </div>
        <span className={`${styles.wagerStatus} ${getStatusClass(wager.status)}`}>
          {getStatusLabel(wager.status)}
        </span>
      </div>

      <p className={styles.wagerCondition}>{wager.condition || 'No condition specified'}</p>

      <div className={styles.wagerDetails}>
        <div className={styles.wagerDetailItem}>
          <span className={styles.detailLabel}>💰 Amount:</span>
          <span className={styles.detailValue}>{formatAmount(wager.amount)} BNB</span>
        </div>
        <div className={styles.wagerDetailItem}>
          <span className={styles.detailLabel}>👥 Participants:</span>
          <span className={styles.detailValue}>{wager.participants?.length || 0}</span>
        </div>
        {wager.category && (
          <div className={styles.wagerDetailItem}>
            <span className={styles.detailLabel}>Category:</span>
            <span className={styles.detailValue}>
              {wager.category === 'sports' ? '🏀 Sports' : '💰 Crypto'}
            </span>
          </div>
        )}
        {wager.createdAt && (
          <div className={styles.wagerDetailItem}>
            <span className={styles.detailLabel}>Created:</span>
            <span className={styles.detailValue}>{formatDate(wager.createdAt)}</span>
          </div>
        )}
        {wager.winner && (
          <div className={styles.wagerDetailItem}>
            <span className={styles.detailLabel}>Winner:</span>
            <span className={styles.detailValue}>
              {wager.winner.slice(0, 6)}...{wager.winner.slice(-4)}
            </span>
          </div>
        )}
        {wager.charityEnabled && (
          <div className={styles.wagerDetailItem}>
            <span className={styles.detailLabel}>💝 Charity:</span>
            <span className={styles.detailValue}>{wager.charityPercentage}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

