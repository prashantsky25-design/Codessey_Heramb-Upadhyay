import {
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
  WalletClient
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from '../config.js';
import { ChainConfig } from '@crossproof/shared';
import fs from 'fs';
import path from 'path';

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

    // Dynamic resolution from deployed-addresses.json if available
    try {
      const possibleDeploymentPaths = [
        path.resolve(process.cwd(), 'deployed-addresses.json'),
        path.resolve(process.cwd(), '../deployed-addresses.json'),
        path.resolve(process.cwd(), '../../deployed-addresses.json')
      ];
      for (const p of possibleDeploymentPaths) {
        if (fs.existsSync(p)) {
          const dep = JSON.parse(fs.readFileSync(p, 'utf8'));
          if (chainId === 31337 && dep.sourceBridge) {
            c.sourceBridgeAddress = dep.sourceBridge;
          } else if (chainId === 31338) {
            if (dep.destinationVerifier) c.destinationVerifierAddress = dep.destinationVerifier;
            if (dep.headerOracle) c.headerOracleAddress = dep.headerOracle;
            if (dep.destinationReceiver || dep.appReceiver) c.receiverAddress = dep.destinationReceiver || dep.appReceiver;
          }
          break;
        }
      }
    } catch {
      // fallback to static config
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
