import axios from 'axios';

// Membase uses environment variables and hub storage, not API keys
// Hub URL: https://testnet.hub.membase.io/
const MEMBASE_HUB_URL = process.env.NEXT_PUBLIC_MEMBASE_HUB_URL || 'https://testnet.hub.membase.io';

export interface MembaseMemory {
  id: string;
  key: string;
  value: any;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface MembaseMessage {
  name: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  metadata?: string;
}

export class MembaseService {
  private membaseId: string;
  private membaseAccount: string;
  private membaseSecretKey: string;
  private hubUrl: string;

  constructor() {
    // Membase uses environment variables, not API keys
    this.membaseId = process.env.MEMBASE_ID || process.env.NEXT_PUBLIC_MEMBASE_ID || 'default';
    this.membaseAccount = process.env.MEMBASE_ACCOUNT || process.env.NEXT_PUBLIC_MEMBASE_ACCOUNT || 'default';
    this.membaseSecretKey = process.env.MEMBASE_SECRET_KEY || '';
    this.hubUrl = MEMBASE_HUB_URL;
  }

  /**
   * Store memory in Membase hub
   * Uses conversation-based storage similar to MultiMemory
   */
  async store(
    key: string,
    value: any,
    metadata?: Record<string, any>,
    conversationId?: string
  ): Promise<MembaseMemory> {
    try {
      // Store to Membase hub
      const message: MembaseMessage = {
        name: this.membaseId,
        content: typeof value === 'string' ? value : JSON.stringify(value),
        role: 'assistant',
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      };

      const response = await axios.post(
        `${this.hubUrl}/memory/store`,
        {
          account: this.membaseAccount,
          conversation_id: conversationId || key,
          message,
          metadata,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.membaseSecretKey && {
              'Authorization': `Bearer ${this.membaseSecretKey}`,
            }),
          },
        }
      );

      return {
        id: response.data.id || `mem_${Date.now()}`,
        key,
        value,
        metadata,
        createdAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Membase store error:', error);
      // Fallback to local storage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`membase_${key}`, JSON.stringify({ value, metadata, conversationId }));
      }
      return {
        id: `mem_${Date.now()}`,
        key,
        value,
        metadata,
        createdAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Retrieve memory from Membase hub
   */
  async retrieve(key: string, conversationId?: string): Promise<MembaseMemory | null> {
    try {
      const response = await axios.get(`${this.hubUrl}/memory/retrieve`, {
        params: {
          account: this.membaseAccount,
          conversation_id: conversationId || key,
        },
        headers: {
          ...(this.membaseSecretKey && {
            'Authorization': `Bearer ${this.membaseSecretKey}`,
          }),
        },
      });

      if (response.data && response.data.messages) {
        const lastMessage = response.data.messages[response.data.messages.length - 1];
        return {
          id: key,
          key,
          value: lastMessage.content,
          metadata: lastMessage.metadata ? JSON.parse(lastMessage.metadata) : undefined,
        };
      }

      return null;
    } catch (error: any) {
      console.error('Membase retrieve error:', error);
      // Fallback to local storage
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`membase_${key}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            id: key,
            key,
            value: parsed.value,
            metadata: parsed.metadata,
          };
        }
      }
      return null;
    }
  }

  /**
   * Search memories in Membase hub
   */
  async search(query: string, filters?: Record<string, any>): Promise<MembaseMemory[]> {
    try {
      const response = await axios.post(
        `${this.hubUrl}/memory/search`,
        {
          account: this.membaseAccount,
          query,
          filters,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.membaseSecretKey && {
              'Authorization': `Bearer ${this.membaseSecretKey}`,
            }),
          },
        }
      );

      return (response.data.results || []).map((result: any) => ({
        id: result.id,
        key: result.conversation_id || result.id,
        value: result.content || result.value,
        metadata: result.metadata,
        createdAt: result.created_at,
      }));
    } catch (error: any) {
      console.error('Membase search error:', error);
      return [];
    }
  }

  /**
   * Delete memory from Membase hub
   */
  async delete(key: string, conversationId?: string): Promise<boolean> {
    try {
      await axios.delete(`${this.hubUrl}/memory/delete`, {
        params: {
          account: this.membaseAccount,
          conversation_id: conversationId || key,
        },
        headers: {
          ...(this.membaseSecretKey && {
            'Authorization': `Bearer ${this.membaseSecretKey}`,
          }),
        },
      });

      // Also remove from local storage fallback
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`membase_${key}`);
      }

      return true;
    } catch (error: any) {
      console.error('Membase delete error:', error);
      return false;
    }
  }

  /**
   * Add message to conversation (MultiMemory style)
   */
  async addMessage(
    message: MembaseMessage,
    conversationId: string
  ): Promise<void> {
    await this.store(
      `msg_${Date.now()}`,
      message.content,
      {
        name: message.name,
        role: message.role,
        ...(message.metadata && { metadata: message.metadata }),
      },
      conversationId
    );
  }

  /**
   * Get all messages from a conversation
   */
  async getConversation(conversationId: string): Promise<MembaseMessage[]> {
    try {
      const response = await axios.get(`${this.hubUrl}/memory/conversation`, {
        params: {
          account: this.membaseAccount,
          conversation_id: conversationId,
        },
        headers: {
          ...(this.membaseSecretKey && {
            'Authorization': `Bearer ${this.membaseSecretKey}`,
          }),
        },
      });

      return (response.data.messages || []).map((msg: any) => ({
        name: msg.name || this.membaseId,
        content: msg.content,
        role: msg.role || 'assistant',
        metadata: msg.metadata,
      }));
    } catch (error: any) {
      console.error('Membase get conversation error:', error);
      return [];
    }
  }
}

export const membaseService = new MembaseService();
