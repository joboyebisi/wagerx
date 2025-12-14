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
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isProcessing) return;

    setIsProcessing(true);
    setValidationError(null);
    
    try {
      const response = await fetch('/api/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (response.ok) {
        const intent: WagerIntent = await response.json();
        
        // Validate create intent
        if (intent.type === 'create') {
          if (intent.missingFields && intent.missingFields.length > 0) {
            const missingText = intent.missingFields.map(f => {
              if (f === 'category') return 'category (sports or crypto)';
              if (f === 'participants') return 'participants (at least 2)';
              return f;
            }).join(', ');
            
            setValidationError(`Missing required fields: ${missingText}. Please provide all information.`);
            return;
          }
          
          if (intent.isValid === false) {
            setValidationError('Please provide all required information: category, amount, condition, and at least 2 participants.');
            return;
          }
        }
        
        // All validations passed
        onIntentDetected(intent, message);
        setMessage('');
        setValidationError(null);
      } else {
        throw new Error('Failed to detect intent');
      }
    } catch (error) {
      console.error('Intent detection error:', error);
      setValidationError('Failed to process your message. Please try again.');
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
      {validationError && (
        <div className={styles.validationError}>
          ⚠️ {validationError}
        </div>
      )}
      <div className={styles.hint}>
        💡 Try: &quot;I bet 10 BNB that Team A wins&quot; or &quot;Accept wager #123&quot;
      </div>
    </form>
  );
}

