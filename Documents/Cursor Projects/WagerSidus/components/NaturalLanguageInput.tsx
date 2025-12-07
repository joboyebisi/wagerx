'use client';

import { useState } from 'react';
import { WagerIntent } from '@/lib/services/perplexity';
import styles from './NaturalLanguageInput.module.css';

interface NaturalLanguageInputProps {
  onIntentDetected: (intent: WagerIntent, message: string) => void;
  placeholder?: string;
}

export default function NaturalLanguageInput({
  onIntentDetected,
  placeholder = "Type your wager in natural language...",
}: NaturalLanguageInputProps) {
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (response.ok) {
        const intent = await response.json();
        onIntentDetected(intent, message);
        setMessage('');
      } else {
        throw new Error('Failed to detect intent');
      }
    } catch (error) {
      console.error('Intent detection error:', error);
      alert('Failed to process your message. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form className={styles.naturalLanguageInput} onSubmit={handleSubmit}>
      <div className={styles.inputContainer}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          rows={3}
          disabled={isProcessing}
          className={styles.messageInput}
        />
        <button
          type="submit"
          disabled={!message.trim() || isProcessing}
          className={styles.sendButton}
        >
          {isProcessing ? '...' : 'Send'}
        </button>
      </div>
      <div className={styles.hint}>
        💡 Try: &quot;I bet 10 BNB that Team A wins&quot; or &quot;Accept wager #123&quot;
      </div>
    </form>
  );
}

