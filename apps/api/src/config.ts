import { SUPPORTED_CHAINS, ChainConfig } from '@crossproof/shared';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

export interface ServerConfig {
  port: number;
  host: string;
  chains: Record<number, ChainConfig>;
  relayerPrivateKey: `0x${string}`;
}

const DEFAULT_ANVIL_RELAYER_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

let deployedAddresses: any = {};
const possibleDeploymentPaths = [
  path.resolve(process.cwd(), 'deployed-addresses.json'),
  path.resolve(process.cwd(), '../deployed-addresses.json'),
  path.resolve(process.cwd(), '../../deployed-addresses.json')
];

for (const p of possibleDeploymentPaths) {
  try {
    if (fs.existsSync(p)) {
      deployedAddresses = JSON.parse(fs.readFileSync(p, 'utf8'));
      break;
    }
  } catch {
    // ignore
  }
}

const sourceBridge =
  process.env.SOURCE_BRIDGE_ADDRESS ||
  deployedAddresses.sourceBridge ||
  SUPPORTED_CHAINS[31337]?.sourceBridgeAddress;

const destVerifier =
  process.env.DEST_VERIFIER_ADDRESS ||
  deployedAddresses.destinationVerifier ||
  SUPPORTED_CHAINS[31338]?.destinationVerifierAddress;

const headerOracle =
  process.env.HEADER_ORACLE_ADDRESS ||
  deployedAddresses.headerOracle ||
  SUPPORTED_CHAINS[31338]?.headerOracleAddress;

const receiver =
  process.env.RECEIVER_ADDRESS ||
  deployedAddresses.appReceiver ||
  SUPPORTED_CHAINS[31338]?.receiverAddress;

const addressRegex = /^0x[0-9a-fA-F]{40}$/;

if (sourceBridge && !addressRegex.test(sourceBridge)) {
  throw new Error(`Invalid sourceBridgeAddress configuration: ${sourceBridge}`);
}
if (destVerifier && !addressRegex.test(destVerifier)) {
  throw new Error(`Invalid destinationVerifierAddress configuration: ${destVerifier}`);
}
if (headerOracle && !addressRegex.test(headerOracle)) {
  throw new Error(`Invalid headerOracleAddress configuration: ${headerOracle}`);
}
if (receiver && !addressRegex.test(receiver)) {
  throw new Error(`Invalid receiverAddress configuration: ${receiver}`);
}

export const config: ServerConfig = {
  port: Number(process.env.PORT || 3001),
  host: process.env.HOST || '0.0.0.0',
  chains: {
    ...SUPPORTED_CHAINS,
    31337: {
      ...SUPPORTED_CHAINS[31337],
      rpcUrl: process.env.SOURCE_CHAIN_RPC || SUPPORTED_CHAINS[31337]?.rpcUrl || 'http://127.0.0.1:8545',
      sourceBridgeAddress: (sourceBridge as `0x${string}`)
    },
    31338: {
      ...SUPPORTED_CHAINS[31338],
      rpcUrl: process.env.DEST_CHAIN_RPC || SUPPORTED_CHAINS[31338]?.rpcUrl || 'http://127.0.0.1:8546',
      destinationVerifierAddress: (destVerifier as `0x${string}`),
      headerOracleAddress: (headerOracle as `0x${string}`),
      receiverAddress: (receiver as `0x${string}`)
    }
  },
  relayerPrivateKey: (process.env.RELAYER_PRIVATE_KEY as `0x${string}`) || DEFAULT_ANVIL_RELAYER_KEY
};

if (!config.chains[31337].sourceBridgeAddress) {
  throw new Error('Configuration error: Missing sourceBridgeAddress for chain 31337. Run deployment script or set SOURCE_BRIDGE_ADDRESS.');
}
if (!config.chains[31338].destinationVerifierAddress) {
  throw new Error('Configuration error: Missing destinationVerifierAddress for chain 31338.');
}
if (!config.chains[31338].headerOracleAddress) {
  throw new Error('Configuration error: Missing headerOracleAddress for chain 31338.');
}
if (!config.chains[31338].receiverAddress) {
  throw new Error('Configuration error: Missing receiverAddress for chain 31338.');
}
