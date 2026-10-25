import test from 'node:test';
import assert from 'node:assert';
import { buildServer } from '../server.js';

test('verification routes - validation and error handling', async () => {
  const server = buildServer();
  await server.ready();

  // Test 1: POST /api/verification/verify with invalid schema / missing fields
  const res1 = await server.inject({
    method: 'POST',
    url: '/api/verification/verify',
    payload: {}
  });
  assert.strictEqual(res1.statusCode, 400);
  const json1 = res1.json();
  assert.strictEqual(json1.status, 'error');
  assert.strictEqual(json1.code, 'VALIDATION_ERROR');

  // Test 2: GET /api/verification/:verificationId with non-existent ID
  const res2 = await server.inject({
    method: 'GET',
    url: '/api/verification/nonexistent-id-12345'
  });
  assert.strictEqual(res2.statusCode, 404);
  const json2 = res2.json();
  assert.strictEqual(json2.status, 'error');
  assert.strictEqual(json2.code, 'NOT_FOUND');

  // Test 3: POST /api/verification/verify with tampered MPT proof (should return valid: false)
  const res3 = await server.inject({
    method: 'POST',
    url: '/api/verification/verify',
    payload: {
      sourceChainId: 31337,
      destinationChainId: 31338,
      sourceTxHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      proof: {
        sourceChainId: 31337,
        sourceContract: '0x1234567890123456789012345678901234567890',
        blockNumber: 1,
        blockHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        receiptsRoot: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        txIndex: 0,
        receiptRlp: '0x1234',
        mptProof: ['0xdeadbeef'],
        payload: '0x1234'
      }
    }
  });
  assert.strictEqual(res3.statusCode, 200);
  const json3 = res3.json();
  assert.strictEqual(json3.status, 'success');
  assert.strictEqual(json3.valid, false);
  assert.strictEqual(json3.checks.mptInclusionValid, false);

  // Test 4: POST /api/verification/verify with sourceChainId mismatch
  const res4 = await server.inject({
    method: 'POST',
    url: '/api/verification/verify',
    payload: {
      sourceChainId: 31337,
      destinationChainId: 31338,
      sourceTxHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      proof: {
        sourceChainId: 99999, // Mismatch
        sourceContract: '0x1234567890123456789012345678901234567890',
        blockNumber: 1,
        blockHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        receiptsRoot: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        txIndex: 0,
        receiptRlp: '0x1234',
        mptProof: ['0xdeadbeef'],
        payload: '0x1234'
      }
    }
  });
  assert.strictEqual(res4.statusCode, 400);
  const json4 = res4.json();
  assert.strictEqual(json4.code, 'SOURCE_CHAIN_ID_MISMATCH');

  await server.close();
});
