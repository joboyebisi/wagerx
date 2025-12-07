import { membaseService } from './membase';
import { WagerContract } from './sidusAI';
import { WagerIntent } from './perplexity';
import { WagerCategory } from './verification';

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

    // Store in Membase
    const key = `memory:${address}:${memoryEntry.id}`;
    await membaseService.store(key, memoryEntry, {
      type: memoryEntry.type,
      category: memoryEntry.category,
      chainId: memoryEntry.chainId,
      participants: memoryEntry.participants,
    });

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
    // Search Membase for memories
    const searchQuery = `address:${address}${filters?.type ? ` type:${filters.type}` : ''}${filters?.category ? ` category:${filters.category}` : ''}`;
    const results = await membaseService.search(searchQuery, {
      address,
      ...(filters?.type && { type: filters.type }),
      ...(filters?.category && { category: filters.category }),
      ...(filters?.chainId && { chainId: filters.chainId }),
    });

    let memories = results.map((result) => result.value as MemoryEntry);

    // Filter by participant if specified
    if (filters?.participant) {
      memories = memories.filter((mem) =>
        mem.participants.includes(filters.participant!)
      );
    }

    // Sort by timestamp descending
    memories.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return memories;
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

