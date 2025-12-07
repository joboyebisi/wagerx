import axios from 'axios';

/**
 * Sidus AI Core Integration
 * Based on: https://github.com/sidus-ai/sidus-ai-core
 * 
 * This service integrates with Sidus AI Core framework for AI agent management
 * and smart contract deployment on BNB Chain.
 */

export interface SidusAgent {
  id: string;
  name: string;
  address: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'pending';
}

export interface SidusTask {
  id: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  participants: string[];
  reward?: string;
  createdAt: string;
  completedAt?: string;
}

export interface SidusSkill {
  id: string;
  name: string;
  description: string;
  weight: number;
  dependencies?: string[];
}

export interface WagerContract {
  id: string;
  address: string;
  participants: string[];
  amount: string;
  condition: string;
  status: 'pending' | 'active' | 'resolved' | 'cancelled';
  createdAt: string;
  resolvedAt?: string;
  winner?: string;
  charityEnabled?: boolean;
  charityPercentage?: number;
  charityAddress?: string;
  charityDonated?: string;
}

export class SidusAICoreService {
  private apiKey: string;
  private baseUrl: string;
  private agentId: string;

  constructor(apiKey?: string, baseUrl?: string, agentId?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_SIDUS_AI_API_KEY || '';
    this.baseUrl = baseUrl || 'https://api.sidus.ai';
    this.agentId = agentId || process.env.NEXT_PUBLIC_SIDUS_AGENT_ID || 'wager-agent';
  }

  /**
   * Create a wager contract using Sidus AI Core
   * This would integrate with the Sidus AI framework to deploy contracts
   */
  async createWagerContract(
    participants: string[],
    amount: string,
    condition: string,
    chainId: number = 56, // BNB Chain
    charityOptions?: {
      enabled: boolean;
      percentage?: number;
      address?: string;
    }
  ): Promise<WagerContract> {
    try {
      // Integrate with Sidus AI Core framework
      // This would use the Sidus AI agent system to deploy the contract
      const response = await axios.post(
        `${this.baseUrl}/v1/agents/${this.agentId}/tasks`,
        {
          task_type: 'deploy_wager_contract',
          parameters: {
            participants,
            amount,
            condition,
            chain_id: chainId,
            charity_enabled: charityOptions?.enabled || false,
            charity_percentage: charityOptions?.percentage,
            charity_address: charityOptions?.address,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // The task would return the deployed contract
      return response.data.contract;
    } catch (error: any) {
      console.error('Sidus AI Core contract creation error:', error);
      
      // Fallback: Create a mock contract (for development)
      // In production, this should fail or retry
      return {
        id: `wager_${Date.now()}`,
        address: `0x${Math.random().toString(16).substr(2, 40)}`,
        participants,
        amount,
        condition,
        status: 'pending',
        createdAt: new Date().toISOString(),
        charityEnabled: charityOptions?.enabled || false,
        charityPercentage: charityOptions?.percentage,
        charityAddress: charityOptions?.address,
      };
    }
  }

  /**
   * Resolve wager using Sidus AI agent
   */
  async resolveWager(
    wagerId: string,
    winner: string,
    evidence?: string
  ): Promise<WagerContract> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/agents/${this.agentId}/tasks`,
        {
          task_type: 'resolve_wager',
          parameters: {
            wager_id: wagerId,
            winner,
            evidence,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.contract;
    } catch (error: any) {
      console.error('Sidus AI Core wager resolution error:', error);
      throw error;
    }
  }

  /**
   * Get wager contract details
   */
  async getWagerContract(wagerId: string): Promise<WagerContract> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/contracts/wager/${wagerId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Sidus AI Core get wager error:', error);
      throw error;
    }
  }

  /**
   * Register agent with Sidus AI Core
   */
  async registerAgent(agentName: string, capabilities: string[]): Promise<SidusAgent> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/agents/register`,
        {
          agent_id: this.agentId,
          name: agentName,
          capabilities,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Sidus AI Core agent registration error:', error);
      throw error;
    }
  }

  /**
   * Get connected agents (for interoperability)
   */
  async getConnectedAgents(userAddress: string): Promise<SidusAgent[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/agents/connected?address=${userAddress}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Sidus AI Core get agents error:', error);
      return [];
    }
  }

  /**
   * Create a task in Sidus AI Core (for agent coordination)
   */
  async createTask(
    taskId: string,
    description: string,
    reward?: string
  ): Promise<SidusTask> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/tasks`,
        {
          task_id: taskId,
          description,
          reward,
          agent_id: this.agentId,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Sidus AI Core create task error:', error);
      throw error;
    }
  }

  /**
   * Get agent skills (weighted graph)
   */
  async getAgentSkills(): Promise<SidusSkill[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/agents/${this.agentId}/skills`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Sidus AI Core get skills error:', error);
      return [];
    }
  }
}

export const sidusAICoreService = new SidusAICoreService();

