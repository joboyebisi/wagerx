'use client';

import { useState } from 'react';
import { useTelegram } from '@/lib/hooks/useTelegram';
import styles from './InviteParticipants.module.css';

interface InviteParticipantsProps {
  wagerId: string;
  currentParticipants: string[];
}

export default function InviteParticipants({ wagerId, currentParticipants }: InviteParticipantsProps) {
  const { showAlert } = useTelegram();
  const [participantInput, setParticipantInput] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState('');

  // Generate invite link
  const generateInviteLink = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${baseUrl}/wagers/${wagerId}?invite=true`;
    setInviteLink(link);
    return link;
  };

  // Copy invite link
  const copyInviteLink = async () => {
    const link = inviteLink || generateInviteLink();
    try {
      await navigator.clipboard.writeText(link);
      showAlert('Invite link copied to clipboard!');
    } catch {
      showAlert(`Invite link: ${link}`);
    }
  };

  // Add participant
  const handleAddParticipant = async () => {
    if (!participantInput.trim()) {
      showAlert('Please enter a wallet address, Telegram username (@username), or Telegram ID');
      return;
    }

    setIsInviting(true);
    try {
      const response = await fetch(`/api/wagers/${wagerId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participants: [participantInput.trim()],
        }),
      });

      const data = await response.json();

      if (data.success) {
        showAlert(`✅ Added ${data.added} participant(s)!`);
        setParticipantInput('');
        // Reload page to show new participants
        window.location.reload();
      } else {
        showAlert(`❌ ${data.error || 'Failed to add participant'}`);
      }
    } catch (error: any) {
      showAlert(`❌ Error: ${error.message || 'Failed to invite participant'}`);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className={styles.inviteContainer}>
      <div className={styles.inviteLinkSection}>
        <label>🔗 Invite Link</label>
        <div className={styles.linkInputGroup}>
          <input
            type="text"
            value={inviteLink || generateInviteLink()}
            readOnly
            className={styles.linkInput}
          />
          <button onClick={copyInviteLink} className={styles.copyButton}>
            📋 Copy
          </button>
        </div>
        <p className={styles.helpText}>
          Share this link with friends to join the wager
        </p>
      </div>

      <div className={styles.addParticipantSection}>
        <label>➕ Add Participant</label>
        <div className={styles.inputGroup}>
          <input
            type="text"
            value={participantInput}
            onChange={(e) => setParticipantInput(e.target.value)}
            placeholder="Wallet address (0x...), @username, or Telegram ID"
            className={styles.participantInput}
            disabled={isInviting}
          />
          <button
            onClick={handleAddParticipant}
            disabled={isInviting || !participantInput.trim()}
            className={styles.addButton}
          >
            {isInviting ? 'Adding...' : 'Add'}
          </button>
        </div>
        <p className={styles.helpText}>
          Enter a wallet address (0x...), Telegram username (@username), or Telegram ID
        </p>
      </div>

      <div className={styles.currentParticipants}>
        <label>Current Participants: {currentParticipants.length}</label>
      </div>
    </div>
  );
}

