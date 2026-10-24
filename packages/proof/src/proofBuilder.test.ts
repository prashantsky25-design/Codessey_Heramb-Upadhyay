import test from 'node:test';
import assert from 'node:assert';
import { buildReceiptInclusionProof } from './proofBuilder';
import { PublicClient, TransactionReceipt, Hash } from 'viem';
import { encodeTxIndexToRlp, encodeReceiptToRlp } from './rlpEncoder';
import { Trie } from '@ethereumjs/trie';
import { bytesToHex } from '@ethereumjs/util';

test('buildReceiptInclusionProof - receiptsRoot comparison', async () => {
  const mockReceipt: TransactionReceipt = {
    blockHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hash,
    blockNumber: 1n,
    contractAddress: null,
    cumulativeGasUsed: 21000n,
    effectiveGasPrice: 1n,
    from: '0x1111111111111111111111111111111111111111',
    gasUsed: 21000n,
    logs: [],
    logsBloom: '0x0',
    status: 'success',
    to: '0x2222222222222222222222222222222222222222',
    transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hash,
    transactionIndex: 0,
    type: 'eip1559'
  };

  const trie = await Trie.create();
  await trie.put(encodeTxIndexToRlp(mockReceipt.transactionIndex), encodeReceiptToRlp(mockReceipt));
  const correctRoot = bytesToHex(trie.root());
  const wrongRoot = '0x1111111111111111111111111111111111111111111111111111111111111111';

  const mockBlock: any = {
    hash: mockReceipt.blockHash,
    number: mockReceipt.blockNumber,
    receiptsRoot: wrongRoot,
    transactions: [mockReceipt.transactionHash]
  };

  const mockClient = {
    chain: { id: 31337 },
    getTransactionReceipt: async ({ hash }: { hash: Hash }) => {
      if (hash === mockReceipt.transactionHash) return mockReceipt;
      return null;
    },
    getBlock: async () => mockBlock
  } as unknown as PublicClient;

  // Case 1: Roots DO NOT match -> should throw Receipts root mismatch error
  await assert.rejects(
    async () => {
      await buildReceiptInclusionProof(mockClient, mockReceipt.transactionHash);
    },
    (err: any) => {
      assert.match(err.message, /Receipts root mismatch/i);
      return true;
    }
  );

  // Case 2: Roots DO match -> should proceed past root check (failing later at event parsing)
  mockBlock.receiptsRoot = correctRoot;

  await assert.rejects(
    async () => {
      await buildReceiptInclusionProof(mockClient, mockReceipt.transactionHash);
    },
    (err: any) => {
      assert.doesNotMatch(err.message, /Receipts root mismatch/i);
      assert.match(err.message, /did not emit a valid MessageDispatched event/i);
      return true;
    }
  );
});

test('buildReceiptInclusionProof - input validations', async () => {
  const mockClient = {
    chain: { id: 31337 },
    getTransactionReceipt: async () => null,
    getBlock: async () => null
  } as unknown as PublicClient;

  // 1. Invalid transaction hash format
  await assert.rejects(
    async () => {
      await buildReceiptInclusionProof(mockClient, '0xinvalid' as Hash);
    },
    (err: any) => {
      assert.match(err.message, /Invalid transaction hash format/i);
      return true;
    }
  );

  // 2. Receipt not found
  await assert.rejects(
    async () => {
      await buildReceiptInclusionProof(
        mockClient,
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hash
      );
    },
    (err: any) => {
      assert.match(err.message, /Receipt not found/i);
      return true;
    }
  );
});
