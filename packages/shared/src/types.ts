import { z } from 'zod';

export interface ChainConfig {
  id: number;
  name: string;
  shortName: string;
  rpcUrl: string;
  sourceBridgeAddress?: `0x${string}`;
  destinationVerifierAddress?: `0x${string}`;
  headerOracleAddress?: `0x${string}`;
  receiverAddress?: `0x${string}`;
  isSource: boolean;
  isDestination: boolean;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl?: string;
}

export interface CrossChainMessage {
  messageId: `0x${string}`;
  sourceChainId: number;
  sourceContract: `0x${string}`;
  destinationChainId: number;
  destinationReceiver: `0x${string}`;
  nonce: bigint;
  payload: `0x${string}`;
  payloadHash: `0x${string}`;
}

export interface CrossChainProofData {
  sourceChainId: number;
  sourceContract: `0x${string}`;
  blockNumber: number;
  blockHash: `0x${string}`;
  receiptsRoot: `0x${string}`;
  txIndex: number;
  receiptRlp: `0x${string}`;
  mptProof: `0x${string}`[];
  payload: `0x${string}`;
}

export interface VerificationRecord {
  verificationId: string;
  messageId: `0x${string}`;
  sourceChainId: number;
  sourceContract: `0x${string}`;
  destinationChainId: number;
  destinationReceiver: `0x${string}`;
  sourceTxHash: `0x${string}`;
  destinationTxHash?: `0x${string}`;
  blockNumber: number;
  txIndex: number;
  payload: `0x${string}`;
  payloadHash: `0x${string}`;
  verifiedAt: number;
  gasUsed?: string;
  proofTimeMs?: number;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
  trustMode: 'MODE_A_LOCAL_ORACLE' | 'MODE_B_LIGHT_CLIENT';
}

export type TimelineStageId =
  | 'tx_found'
  | 'receipt_proof_retrieved'
  | 'inclusion_validated'
  | 'header_finality_validated'
  | 'destination_verifier_called'
  | 'on_chain_confirmed';

export interface TimelineStage {
  id: TimelineStageId;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  timestamp?: number;
  details?: string;
  error?: string;
}

// Zod schemas for backend validation
export const PrepareVerificationSchema = z.object({
  sourceChainId: z.number().int().positive(),
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'Invalid transaction hash format'),
  destinationChainId: z.number().int().positive().optional()
});

export const VerifyProofSchema = z.object({
  sourceChainId: z.number().int().positive(),
  destinationChainId: z.number().int().positive(),
  sourceTxHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  proof: z.object({
    sourceChainId: z.number().int(),
    sourceContract: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    blockNumber: z.number().int().nonnegative(),
    blockHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
    receiptsRoot: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
    txIndex: z.number().int().nonnegative(),
    receiptRlp: z.string().regex(/^0x[0-9a-fA-F]+$/),
    mptProof: z.array(z.string().regex(/^0x[0-9a-fA-F]+$/)),
    payload: z.string().regex(/^0x[0-9a-fA-F]*$/)
  }),
  headerProof: z.string().default('0x')
});

export const SubmitVerificationSchema = z.object({
  sourceChainId: z.number().int().positive(),
  destinationChainId: z.number().int().positive(),
  sourceTxHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  proof: z.object({
    sourceChainId: z.number().int(),
    sourceContract: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    blockNumber: z.number().int().nonnegative(),
    blockHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
    receiptsRoot: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
    txIndex: z.number().int().nonnegative(),
    receiptRlp: z.string().regex(/^0x[0-9a-fA-F]+$/),
    mptProof: z.array(z.string().regex(/^0x[0-9a-fA-F]+$/)),
    payload: z.string().regex(/^0x[0-9a-fA-F]*$/)
  }),
  headerProof: z.string().default('0x'),
  simulateTamper: z.enum(['none', 'proof_node', 'payload', 'replay']).optional().default('none')
});
