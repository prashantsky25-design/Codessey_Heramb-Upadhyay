import { ChainConfig } from './types';

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  31337: {
    id: 31337,
    name: 'Ethereum Local (Source)',
    shortName: 'ETH-Local',
    rpcUrl: 'http://127.0.0.1:8545',
    sourceBridgeAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
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
    destinationVerifierAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    headerOracleAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    receiverAddress: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
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
