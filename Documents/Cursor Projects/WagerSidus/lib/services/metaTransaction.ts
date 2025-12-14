/**
 * Meta-Transaction Service - Gasless Transactions
 * Users sign messages, relayer pays gas
 */

import { ethers } from 'ethers';

export interface MetaWagerParams {
  userAddress: string;
  participants: string[];
  amount: string;
  condition: string;
  charityEnabled?: boolean;
  charityPercentage?: number;
  charityAddress?: string;
  nonce: number;
}

export class MetaTransactionService {
  private contractAddress: string;
  private chainId: number;

  constructor(contractAddress: string, chainId: number = 97) {
    this.contractAddress = contractAddress;
    this.chainId = chainId;
  }

  async createSignature(signer: ethers.Signer, params: MetaWagerParams): Promise<string> {
    const domain = {
      name: 'WagerX',
      version: '1',
      chainId: this.chainId,
      verifyingContract: this.contractAddress,
    };

    const types = {
      Wager: [
        { name: 'user', type: 'address' },
        { name: 'participants', type: 'address[]' },
        { name: 'amount', type: 'uint256' },
        { name: 'condition', type: 'string' },
        { name: 'charityEnabled', type: 'bool' },
        { name: 'charityPercentage', type: 'uint8' },
        { name: 'charityAddress', type: 'address' },
        { name: 'nonce', type: 'uint256' },
      ],
    };

    const value = {
      user: params.userAddress,
      participants: params.participants,
      amount: ethers.parseEther(params.amount),
      condition: params.condition,
      charityEnabled: params.charityEnabled || false,
      charityPercentage: params.charityPercentage || 0,
      charityAddress: params.charityAddress || ethers.ZeroAddress,
      nonce: params.nonce,
    };

    return await signer.signTypedData(domain, types, value);
  }

  async verify(signature: string, params: MetaWagerParams): Promise<boolean> {
    try {
      const domain = {
        name: 'WagerX',
        version: '1',
        chainId: this.chainId,
        verifyingContract: this.contractAddress,
      };

      const types = {
        Wager: [
          { name: 'user', type: 'address' },
          { name: 'participants', type: 'address[]' },
          { name: 'amount', type: 'uint256' },
          { name: 'condition', type: 'string' },
          { name: 'charityEnabled', type: 'bool' },
          { name: 'charityPercentage', type: 'uint8' },
          { name: 'charityAddress', type: 'address' },
          { name: 'nonce', type: 'uint256' },
        ],
      };

      const value = {
        user: params.userAddress,
        participants: params.participants,
        amount: ethers.parseEther(params.amount),
        condition: params.condition,
        charityEnabled: params.charityEnabled || false,
        charityPercentage: params.charityPercentage || 0,
        charityAddress: params.charityAddress || ethers.ZeroAddress,
        nonce: params.nonce,
      };

      const recovered = ethers.verifyTypedData(domain, types, value, signature);
      return recovered.toLowerCase() === params.userAddress.toLowerCase();
    } catch {
      return false;
    }
  }
}
