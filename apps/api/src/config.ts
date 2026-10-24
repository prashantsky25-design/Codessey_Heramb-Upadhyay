import { SUPPORTED_CHAINS, ChainConfig } from '@crossproof/shared';
import dotenv from 'dotenv';

dotenv.config();

export interface ServerConfig {
  port: number;
  host: string;
  chains: Record<number, ChainConfig>;
  relayerPrivateKey: `0x${string}`;
}

// Default well-known Anvil account #0 for local relayer execution
const DEFAULT_ANVIL_RELAYER_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

export const config: ServerConfig = {
  port: Number(process.env.PORT || 3001),
  host: process.env.HOST || '0.0.0.0',
  chains: {
    ...SUPPORTED_CHAINS,
    31337: {
      ...SUPPORTED_CHAINS[31337],
      rpcUrl: process.env.SOURCE_CHAIN_RPC || 'http://127.0.0.1:8545',
      sourceBridgeAddress: (process.env.SOURCE_BRIDGE_ADDRESS as `0x${string}`) || '0x5FbDB2315678afecb367f032d93F642f64180aa3'
    },
    31338: {
      ...SUPPORTED_CHAINS[31338],
      rpcUrl: process.env.DEST_CHAIN_RPC || 'http://127.0.0.1:8546',
      destinationVerifierAddress: (process.env.DEST_VERIFIER_ADDRESS as `0x${string}`) || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      headerOracleAddress: (process.env.HEADER_ORACLE_ADDRESS as `0x${string}`) || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      receiverAddress: (process.env.RECEIVER_ADDRESS as `0x${string}`) || '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9'
    }
  },
  relayerPrivateKey: (process.env.RELAYER_PRIVATE_KEY as `0x${string}`) || DEFAULT_ANVIL_RELAYER_KEY
};
