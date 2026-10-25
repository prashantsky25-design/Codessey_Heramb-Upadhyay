import { ChainConfig } from './types.js';

/**
 * Default chain configurations.
 *
 * LOCAL DEVNET ADDRESSES — sourced from deployed-addresses.json produced by the
 * Foundry deployment script.  The API layer (apps/api/src/config.ts) re-reads
 * deployed-addresses.json at start-up and overrides these defaults, so these
 * values act as a compile-time fallback only.
 *
 * Canonical values from deployed-addresses.json (last deployment):
 *   sourceChainId       : 31337
 *   destinationChainId  : 31338
 *   sourceBridge        : 0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9
 *   headerOracle        : 0xa51c1fc2f0d1a1b8494ed1fe312d7c3a78ed91c0
 *   receiptVerifier     : 0x0dcd1bf9a1b36ce34237eeafef220932846bcd82
 *   destinationVerifier : 0x9a676e781a523b5d0c0e43731313a708cb607508
 *   appReceiver         : 0x0b306bf915c4d645ff596e518faf3f9669b97016
 *
 * If you redeploy, update both this file AND deployed-addresses.json.
 */
export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  31337: {
    id: 31337,
    name: 'Ethereum Local (Source)',
    shortName: 'ETH-Local',
    rpcUrl: 'http://127.0.0.1:8545',
    // P0 fix: aligned with deployed-addresses.json → sourceBridge
    sourceBridgeAddress: '0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9',
    isSource: true,
    isDestination: false,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    }
  },
  31338: {
    id: 31338,
    name: 'Optimism Local (Destination)',
    shortName: 'OP-Local',
    rpcUrl: 'http://127.0.0.1:8546',
    // P0 fix: aligned with deployed-addresses.json
    destinationVerifierAddress: '0x9a676e781a523b5d0c0e43731313a708cb607508',
    headerOracleAddress: '0xa51c1fc2f0d1a1b8494ed1fe312d7c3a78ed91c0',
    receiverAddress: '0x0b306bf915c4d645ff596e518faf3f9669b97016',
    isSource: false,
    isDestination: true,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    }
  },
  11155111: {
    id: 11155111,
    name: 'Ethereum Sepolia',
    shortName: 'Sepolia',
    rpcUrl: 'https://rpc.sepolia.org',
    isSource: true,
    isDestination: false,
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrl: 'https://sepolia.etherscan.io'
  },
  84532: {
    id: 84532,
    name: 'Base Sepolia',
    shortName: 'Base-Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    isSource: false,
    isDestination: true,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrl: 'https://sepolia.basescan.org'
  }
};

export const DEFAULT_SOURCE_CHAIN_ID = 31337;
export const DEFAULT_DESTINATION_CHAIN_ID = 31338;
