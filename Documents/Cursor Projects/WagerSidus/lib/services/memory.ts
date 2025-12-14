import { membaseService } from './membase';
import { WagerContract } from './sidusAI';
import { WagerIntent } from './perplexity';
import { WagerCategory } from './verification';
import { getSupabaseClient } from '@/lib/supabase';

export interface MemoryEntry {
  id: string;
  address: string;
  type: 'wager' | 'interaction' | 'agent';
  data: any;
  timestamp: string;
  chainId: number;
  participants: string[];
  category?: WagerCategory; // 'sports' | 'crypto'
}

export class MemoryService {
  async storeMemory(
    address: string,
    entry: Omit<MemoryEntry, 'id' | 'timestamp' | 'address'>
  ): Promise<MemoryEntry> {
    const memoryEntry: MemoryEntry = {
      ...entry,
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      address,
    };

    // Primary: Store in Supabase (if available)
    try {
      const supabase = getSupabaseClient();
      await supabase.from('memory_entries').insert({
        id: memoryEntry.id,
        address: memoryEntry.address,
        type: memoryEntry.type,
        data: memoryEntry.data,
        timestamp: memoryEntry.timestamp,
        chain_id: memoryEntry.chainId,
        participants: memoryEntry.participants,
      });
    } catch (error) {
      console.warn('Supabase storage failed, using fallback:', error);
      // Fallback: Store in Membase (if configured) or local storage
      try {
        const key = `memory:${address}:${memoryEntry.id}`;
        await membaseService.store(key, memoryEntry, {
          type: memoryEntry.type,
          category: memoryEntry.category,
          chainId: memoryEntry.chainId,
          participants: memoryEntry.participants,
        });
      } catch (membaseError) {
        console.warn('Membase storage failed, using local storage:', membaseError);
        // Final fallback: local storage (client-side only)
        if (typeof window !== 'undefined') {
          const existing = JSON.parse(localStorage.getItem('wagersidus_memories') || '[]');
          existing.push(memoryEntry);
          localStorage.setItem('wagersidus_memories', JSON.stringify(existing));
        }
      }
    }

    return memoryEntry;
  }

  async getMemories(
    address: string,
    filters?: {
      type?: MemoryEntry['type'];
      participant?: string;
      chainId?: number;
      category?: WagerCategory;
    }
  ): Promise<MemoryEntry[]> {
    // Primary: Get from Supabase
    try {
      const supabase = getSupabaseClient();
      let query = supabase
        .from('memory_entries')
        .select('*')
        .eq('address', address);

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.chainId) {
        query = query.eq('chain_id', filters.chainId);
      }

      const { data, error } = await query.order('timestamp', { ascending: false });

      if (!error && data) {
        let memories = data.map((row: any) => ({
          id: row.id,
          address: row.address,
          type: row.type,
          data: row.data,
          timestamp: row.timestamp,
          chainId: row.chain_id,
          participants: row.participants || [],
          category: filters?.category, // Category not stored in DB, filter after
        })) as MemoryEntry[];

        // Filter by participant if specified
        if (filters?.participant) {
          memories = memories.filter((mem) =>
            mem.participants.includes(filters.participant!)
          );
        }

        return memories;
      }
    } catch (error) {
      console.warn('Supabase retrieval failed, using fallback:', error);
    }

    // Fallback: Search Membase
    try {
      const searchQuery = `address:${address}${filters?.type ? ` type:${filters.type}` : ''}${filters?.category ? ` category:${filters.category}` : ''}`;
      const results = await membaseService.search(searchQuery, {
        address,
        ...(filters?.type && { type: filters.type }),
        ...(filters?.category && { category: filters.category }),
        ...(filters?.chainId && { chainId: filters.chainId }),
      });

      let memories = results.map((result) => result.value as MemoryEntry);

      if (filters?.participant) {
        memories = memories.filter((mem) =>
          mem.participants.includes(filters.participant!)
        );
      }

      memories.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return memories;
    } catch (error) {
      console.warn('Membase retrieval failed, using local storage:', error);
    }

    // Final fallback: Local storage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('wagersidus_memories');
      if (stored) {
        const allMemories = JSON.parse(stored) as MemoryEntry[];
        let memories = allMemories.filter((mem) => mem.address === address);

        if (filters?.type) {
          memories = memories.filter((mem) => mem.type === filters.type);
        }

        if (filters?.participant) {
          memories = memories.filter((mem) =>
            mem.participants.includes(filters.participant!)
          );
        }

        memories.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        return memories;
      }
    }

    return [];
  }

  async storeWager(
    wager: WagerContract,
    address: string,
    category?: WagerCategory
  ): Promise<MemoryEntry> {
    // Store in Membase
    const memoryEntry = await this.storeMemory(address, {
      type: 'wager',
      data: wager,
      chainId: 56, // BNB Chain
      participants: wager.participants,
      category,
    });

    return memoryEntry;
  }

  async storeInteraction(
    intent: WagerIntent,
    userMessage: string,
    address: string
  ): Promise<MemoryEntry> {
    return this.storeMemory(address, {
      type: 'interaction',
      data: { intent, userMessage },
      chainId: 56,
      participants: intent.participants || [address],
    });
  }

  async shareMemoryWithAgent(
    fromAddress: string,
    toAddress: string,
    memoryId: string
  ): Promise<boolean> {
    // Get the memory from Membase
    const key = `memory:${fromAddress}:${memoryId}`;
    const memoryResult = await membaseService.retrieve(key);

    if (!memoryResult || !memoryResult.value) {
      return false;
    }

    const memory = memoryResult.value as MemoryEntry;

    // Store in the target agent's memory
    await this.storeMemory(toAddress, {
      type: memory.type,
      data: memory.data,
      chainId: memory.chainId,
      participants: memory.participants || [],
      category: memory.category,
    });

    // Store agent connection in Membase
    const connectionKey = `agent_connection:${fromAddress}:${toAddress}`;
    await membaseService.store(connectionKey, {
      fromAddress,
      toAddress,
      sharedMemoryIds: [memoryId],
      chainId: memory.chainId,
    }, {
      type: 'agent',
      agentAddress: fromAddress,
      connectedAgentAddress: toAddress,
    });

    return true;
  }

  async getWagerHistory(
    address: string,
    category?: WagerCategory
  ): Promise<WagerContract[]> {
    const memories = await this.getMemories(address, {
      type: 'wager',
      category,
    });

    return memories.map((mem) => mem.data as WagerContract);
  }

  async getConnectedAgents(address: string): Promise<string[]> {
    // Search Membase for agent connections
    const results = await membaseService.search(`agent:${address}`, {
      type: 'agent',
      agentAddress: address,
    });

    const connections = results
      .map((result) => result.value as any)
      .filter((conn) => conn.connectedAgentAddress);

    return connections.map((conn) => conn.connectedAgentAddress);
  }
}

export const memoryService = new MemoryService();

