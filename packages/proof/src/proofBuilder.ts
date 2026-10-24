import { Trie } from '@ethereumjs/trie';
import {
  bytesToHex,
  decodeAbiParameters,
  decodeEventLog,
  Hash,
  Hex,
  hexToBytes,
  PublicClient,
  TransactionReceipt
} from 'viem';
import { CrossChainProofData } from '@crossproof/shared';
import { SourceBridgeAbi } from '@crossproof/shared';
import { encodeReceiptToRlp, encodeTxIndexToRlp } from './rlpEncoder';

export interface ProofGenerationResult {
  proof: CrossChainProofData;
  extractedEvent: {
    messageId: Hex;
    sourceChainId: number;
    destinationChainId: number;
    sourceContract: Hex;
    destinationReceiver: Hex;
    nonce: bigint;
    payload: Hex;
    payloadHash: Hex;
  };
  metrics: {
    proofNodesCount: number;
    totalProofSizeBytes: number;
    receiptSizeBytes: number;
    durationMs: number;
  };
}

/**
 * Builds an authentic Merkle Patricia Trie receipt inclusion proof for a given transaction
 */
export async function buildReceiptInclusionProof(
  client: PublicClient,
  txHash: Hash
): Promise<ProofGenerationResult> {
  const startTime = Date.now();

  if (!txHash || typeof txHash !== 'string' || !txHash.startsWith('0x') || txHash.length !== 66) {
    throw new Error(`Invalid transaction hash format: ${txHash}`);
  }

  // 1. Fetch transaction receipt
  const receipt = await client.getTransactionReceipt({ hash: txHash });
  if (!receipt) {
    throw new Error(`Receipt not found for transaction hash ${txHash}`);
  }
  if (receipt.transactionHash && receipt.transactionHash.toLowerCase() !== txHash.toLowerCase()) {
    throw new Error(`Retrieved receipt transaction hash (${receipt.transactionHash}) does not match requested transaction hash (${txHash})`);
  }
  if (receipt.transactionIndex === undefined || receipt.transactionIndex === null || receipt.transactionIndex < 0) {
    throw new Error(`Invalid or missing transaction index for transaction ${txHash}`);
  }
  if (receipt.status !== 'success') {
    throw new Error(`Transaction ${txHash} failed on source chain (status: ${receipt.status})`);
  }

  // 2. Fetch full block including all transactions
  if (!receipt.blockHash) {
    throw new Error(`Receipt for transaction ${txHash} is missing blockHash`);
  }
  const block = await client.getBlock({
    blockHash: receipt.blockHash,
    includeTransactions: true
  });
  if (!block) {
    throw new Error(`Block not found for hash ${receipt.blockHash}`);
  }
  if (block.number === undefined || block.number === null) {
    throw new Error(`Block ${receipt.blockHash} is missing block number`);
  }

  // 3. Collect and encode receipts for all transactions in this block
  const txHashes = block.transactions.map((tx) =>
    typeof tx === 'string' ? tx : tx.hash
  );

  const blockReceipts: TransactionReceipt[] = [];
  for (const h of txHashes) {
    if (h === txHash) {
      blockReceipts.push(receipt);
    } else {
      const r = await client.getTransactionReceipt({ hash: h });
      blockReceipts.push(r);
    }
  }

  // Sort receipts by transaction index to ensure strict ordering
  blockReceipts.sort((a, b) => a.transactionIndex - b.transactionIndex);

  // 4. Construct Patricia Merkle Trie
  const trie = await Trie.create();

  for (const r of blockReceipts) {
    const key = encodeTxIndexToRlp(r.transactionIndex);
    const value = encodeReceiptToRlp(r);
    await trie.put(key, value);
  }

  const reconstructedRoot = bytesToHex(trie.root());
  const canonicalRoot = block.receiptsRoot;

  if (reconstructedRoot.toLowerCase() !== canonicalRoot.toLowerCase()) {
    throw new Error(
      `Receipts root mismatch: reconstructed root (${reconstructedRoot}) does not match canonical source block receiptsRoot (${canonicalRoot})`
    );
  }

  const receiptsRoot = reconstructedRoot;

  // 5. Generate cryptographic inclusion proof for the target receipt
  const targetKey = encodeTxIndexToRlp(receipt.transactionIndex);
  const rawProof = await trie.createProof(targetKey);
  const targetReceiptRlp = encodeReceiptToRlp(receipt);

  // 6. Verify proof locally to guarantee correctness
  const verifiedVal = await Trie.verifyProof(targetKey, rawProof);
  if (!verifiedVal || bytesToHex(verifiedVal) !== bytesToHex(targetReceiptRlp)) {
    throw new Error('Local proof verification failed: generated proof does not match receipt');
  }

  // 7. Parse MessageDispatched event from receipt logs
  let extractedEvent: ProofGenerationResult['extractedEvent'] | null = null;

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: SourceBridgeAbi,
        data: log.data,
        topics: log.topics
      });

      if (decoded.eventName === 'MessageDispatched') {
        const args = decoded.args as {
          messageId: Hex;
          sourceChainId: bigint;
          destinationChainId: bigint;
          sourceContract: Hex;
          destinationReceiver: Hex;
          nonce: bigint;
          payload: Hex;
          payloadHash: Hex;
        };

        extractedEvent = {
          messageId: args.messageId,
          sourceChainId: Number(args.sourceChainId),
          destinationChainId: Number(args.destinationChainId),
          sourceContract: args.sourceContract,
          destinationReceiver: args.destinationReceiver,
          nonce: args.nonce,
          payload: args.payload,
          payloadHash: args.payloadHash
        };
        break;
      }
    } catch {
      // Not a MessageDispatched event log, continue
    }
  }

  if (!extractedEvent) {
    throw new Error(
      `Transaction ${txHash} did not emit a valid MessageDispatched event from SourceBridge`
    );
  }

  const mptProofHex = rawProof.map((node) => bytesToHex(node));
  const receiptRlpHex = bytesToHex(targetReceiptRlp);
  const totalSizeBytes = mptProofHex.reduce((acc, n) => acc + (n.length - 2) / 2, 0);

  const proofData: CrossChainProofData = {
    sourceChainId: client.chain?.id || extractedEvent.sourceChainId,
    sourceContract: extractedEvent.sourceContract,
    blockNumber: Number(block.number),
    blockHash: block.hash,
    receiptsRoot,
    txIndex: receipt.transactionIndex,
    receiptRlp: receiptRlpHex,
    mptProof: mptProofHex,
    payload: extractedEvent.payload
  };

  const durationMs = Date.now() - startTime;

  return {
    proof: proofData,
    extractedEvent,
    metrics: {
      proofNodesCount: mptProofHex.length,
      totalProofSizeBytes: totalSizeBytes,
      receiptSizeBytes: (receiptRlpHex.length - 2) / 2,
      durationMs
    }
  };
}

/**
 * Validates an MPT proof against receiptsRoot off-chain
 */
export async function verifyReceiptInclusionProofLocally(
  receiptsRoot: Hex,
  txIndex: number,
  receiptRlp: Hex,
  mptProof: Hex[]
): Promise<boolean> {
  try {
    const rawProof = mptProof.map((hex) => hexToBytes(hex));
    const proofTrie = await Trie.createFromProof(rawProof);

    const calculatedRoot = bytesToHex(proofTrie.root());
    if (calculatedRoot.toLowerCase() !== receiptsRoot.toLowerCase()) {
      return false;
    }

    const key = encodeTxIndexToRlp(txIndex);
    const value = await proofTrie.get(key, true);
    if (!value) return false;

    return bytesToHex(value).toLowerCase() === receiptRlp.toLowerCase();
  } catch {
    return false;
  }
}
