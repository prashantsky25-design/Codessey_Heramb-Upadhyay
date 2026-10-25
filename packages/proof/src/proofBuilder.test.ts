import test from 'node:test';
import assert from 'node:assert';
import { buildReceiptInclusionProof, verifyReceiptInclusionProofLocally } from './proofBuilder';
import { PublicClient, TransactionReceipt, Hash, Hex } from 'viem';
import { encodeTxIndexToRlp, encodeReceiptToRlp } from './rlpEncoder';
import { Trie } from '@ethereumjs/trie';
import { bytesToHex } from '@ethereumjs/util';

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

test('1. Valid receipt proof generation & local verification', async () => {
  const trie = await Trie.create();
  const key = encodeTxIndexToRlp(0);
  const receiptRlp = encodeReceiptToRlp(mockReceipt);
  await trie.put(key, receiptRlp);
  const rootHex = bytesToHex(trie.root()) as Hex;
  const rawProof = await trie.createProof(key);
  const mptProofHex = rawProof.map((n) => bytesToHex(n) as Hex);

  const isValid = await verifyReceiptInclusionProofLocally(
    rootHex,
    0,
    bytesToHex(receiptRlp) as Hex,
    mptProofHex
  );
  assert.strictEqual(isValid, true, 'Valid proof must verify successfully');
});

test('2. Modified proof nodes (corrupted bytes) rejected', async () => {
  const trie = await Trie.create();
  const key = encodeTxIndexToRlp(0);
  const receiptRlp = encodeReceiptToRlp(mockReceipt);
  await trie.put(key, receiptRlp);
  const rootHex = bytesToHex(trie.root()) as Hex;
  const rawProof = await trie.createProof(key);
  const corruptedProof = rawProof.map((n) => bytesToHex(n) as Hex);
  // Corrupt the first proof node
  corruptedProof[0] = ('0x' + 'ff'.repeat(32)) as Hex;

  const isValid = await verifyReceiptInclusionProofLocally(
    rootHex,
    0,
    bytesToHex(receiptRlp) as Hex,
    corruptedProof
  );
  assert.strictEqual(isValid, false, 'Corrupted proof node must fail verification');
});

test('3. Incorrect root hashes rejected', async () => {
  const trie = await Trie.create();
  const key = encodeTxIndexToRlp(0);
  const receiptRlp = encodeReceiptToRlp(mockReceipt);
  await trie.put(key, receiptRlp);
  const rawProof = await trie.createProof(key);
  const mptProofHex = rawProof.map((n) => bytesToHex(n) as Hex);
  const bogusRoot = '0x1234567890123456789012345678901234567890123456789012345678901234' as Hex;

  const isValid = await verifyReceiptInclusionProofLocally(
    bogusRoot,
    0,
    bytesToHex(receiptRlp) as Hex,
    mptProofHex
  );
  assert.strictEqual(isValid, false, 'Mismatched root must fail verification');
});

test('4. Incorrect transaction indexes rejected', async () => {
  const trie = await Trie.create();
  const key = encodeTxIndexToRlp(0);
  const receiptRlp = encodeReceiptToRlp(mockReceipt);
  await trie.put(key, receiptRlp);
  const rootHex = bytesToHex(trie.root()) as Hex;
  const rawProof = await trie.createProof(key);
  const mptProofHex = rawProof.map((n) => bytesToHex(n) as Hex);

  // Query txIndex 5 when only 0 was inserted
  const isValid = await verifyReceiptInclusionProofLocally(
    rootHex,
    5,
    bytesToHex(receiptRlp) as Hex,
    mptProofHex
  );
  assert.strictEqual(isValid, false, 'Non-existent txIndex must fail verification');
});

test('5. Modified receipt contents rejected', async () => {
  const trie = await Trie.create();
  const key = encodeTxIndexToRlp(0);
  const receiptRlp = encodeReceiptToRlp(mockReceipt);
  await trie.put(key, receiptRlp);
  const rootHex = bytesToHex(trie.root()) as Hex;
  const rawProof = await trie.createProof(key);
  const mptProofHex = rawProof.map((n) => bytesToHex(n) as Hex);

  const modifiedReceipt = { ...mockReceipt, cumulativeGasUsed: 999999n };
  const modifiedReceiptRlp = encodeReceiptToRlp(modifiedReceipt);

  const isValid = await verifyReceiptInclusionProofLocally(
    rootHex,
    0,
    bytesToHex(modifiedReceiptRlp) as Hex,
    mptProofHex
  );
  assert.strictEqual(isValid, false, 'Tampered receipt RLP must fail verification');
});

test('6. Malformed proof encoding rejected', async () => {
  const rootHex = '0x1234567890123456789012345678901234567890123456789012345678901234' as Hex;
  const receiptRlp = encodeReceiptToRlp(mockReceipt);
  const malformedProof = ['0x1234', '0xinvalid'] as Hex[];

  const isValid = await verifyReceiptInclusionProofLocally(
    rootHex,
    0,
    bytesToHex(receiptRlp) as Hex,
    malformedProof
  );
  assert.strictEqual(isValid, false, 'Malformed proof encoding must safely return false');
});

test('7. Missing expected MessageDispatched event throws', async () => {
  const trie = await Trie.create();
  await trie.put(encodeTxIndexToRlp(mockReceipt.transactionIndex), encodeReceiptToRlp(mockReceipt));
  const correctRoot = bytesToHex(trie.root());

  const mockBlock: any = {
    hash: mockReceipt.blockHash,
    number: mockReceipt.blockNumber,
    receiptsRoot: correctRoot,
    transactions: [mockReceipt.transactionHash]
  };

  const mockClient = {
    chain: { id: 31337 },
    getTransactionReceipt: async ({ hash }: { hash: Hash }) => mockReceipt,
    getBlock: async () => mockBlock
  } as unknown as PublicClient;

  await assert.rejects(
    async () => {
      await buildReceiptInclusionProof(mockClient, mockReceipt.transactionHash);
    },
    (err: any) => {
      assert.match(err.message, /did not emit a valid MessageDispatched event/i);
      return true;
    }
  );
});

test('8. Receipts root mismatch on block throws', async () => {
  const wrongRoot = '0x1111111111111111111111111111111111111111111111111111111111111111';
  const mockBlock: any = {
    hash: mockReceipt.blockHash,
    number: mockReceipt.blockNumber,
    receiptsRoot: wrongRoot,
    transactions: [mockReceipt.transactionHash]
  };

  const mockClient = {
    chain: { id: 31337 },
    getTransactionReceipt: async () => mockReceipt,
    getBlock: async () => mockBlock
  } as unknown as PublicClient;

  await assert.rejects(
    async () => {
      await buildReceiptInclusionProof(mockClient, mockReceipt.transactionHash);
    },
    (err: any) => {
      assert.match(err.message, /Receipts root mismatch/i);
      return true;
    }
  );
});

test('9. Invalid transaction hash format throws', async () => {
  const mockClient = {
    chain: { id: 31337 },
    getTransactionReceipt: async () => null,
    getBlock: async () => null
  } as unknown as PublicClient;

  await assert.rejects(
    async () => {
      await buildReceiptInclusionProof(mockClient, '0xinvalid' as Hash);
    },
    (err: any) => {
      assert.match(err.message, /Invalid transaction hash format/i);
      return true;
    }
  );
});
