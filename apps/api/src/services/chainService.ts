import {
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
  WalletClient
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from '../config';
import { ChainConfig } from '@crossproof/shared';

export class ChainService {
  private publicClients: Map<number, PublicClient> = new Map();
  private walletClients: Map<number, WalletClient> = new Map();
  private account = privateKeyToAccount(config.relayerPrivateKey);

  constructor() {
    this.initializeClients();
  }

  private initializeClients() {
    for (const [idStr, chainConfig] of Object.entries(config.chains)) {
      const chainId = Number(idStr);
      try {
        const customChain = {
          id: chainId,
          name: chainConfig.name,
          nativeCurrency: chainConfig.nativeCurrency,
          rpcUrls: {
            default: { http: [chainConfig.rpcUrl] }
          }
        };

        const publicClient = createPublicClient({
          chain: customChain,
          transport: http(chainConfig.rpcUrl, {
            timeout: 10_000,
            retryCount: 2
          })
        });
        this.publicClients.set(chainId, publicClient);

        const walletClient = createWalletClient({
          account: this.account,
          chain: customChain,
          transport: http(chainConfig.rpcUrl, {
            timeout: 15_000
          })
        });
        this.walletClients.set(chainId, walletClient);
      } catch (err) {
        console.error(`Failed to initialize clients for chain ${chainId}:`, err);
      }
    }
  }

  public getPublicClient(chainId: number): PublicClient {
    const client = this.publicClients.get(chainId);
    if (!client) {
      throw new Error(`Unsupported or unconfigured chain ID: ${chainId}`);
    }
    return client;
  }

  public getWalletClient(chainId: number): WalletClient {
    const client = this.walletClients.get(chainId);
    if (!client) {
      throw new Error(`Wallet client unconfigured for chain ID: ${chainId}`);
    }
    return client;
  }

  public getRelayerAddress(): `0x${string}` {
    return this.account.address;
  }

  public getChainConfig(chainId: number): ChainConfig {
    const c = config.chains[chainId];
    if (!c) {
      throw new Error(`Chain ${chainId} not found in configuration`);
    }
    return c;
  }

  public updateChainAddresses(
    chainId: number,
    addresses: Partial<Pick<ChainConfig, 'sourceBridgeAddress' | 'destinationVerifierAddress' | 'headerOracleAddress' | 'receiverAddress'>>
  ) {
    if (config.chains[chainId]) {
      config.chains[chainId] = {
        ...config.chains[chainId],
        ...addresses
      };
    }
  }
}

export const chainService = new ChainService();
