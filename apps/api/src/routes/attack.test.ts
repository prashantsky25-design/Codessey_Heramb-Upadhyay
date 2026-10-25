import test from 'node:test';
import assert from 'node:assert';
import { buildServer } from '../server.js';

test('attack routes - executes attack endpoints with strict outcome semantics', async () => {
  const server = buildServer();
  await server.ready();

  // Test 1: POST /api/attack/tamper-proof with invalid body
  const res1 = await server.inject({
    method: 'POST',
    url: '/api/attack/tamper-proof',
    payload: { destinationChainId: -1 }
  });
  assert.strictEqual(res1.statusCode, 400);

  // Test 2: POST /api/attack/rpc-failure (Must report ERROR, never claim as BLOCKED)
  const res2 = await server.inject({
    method: 'POST',
    url: '/api/attack/rpc-failure',
    payload: {}
  });
  assert.strictEqual(res2.statusCode, 200);
  const json2 = res2.json();
  assert.strictEqual(json2.outcome, 'ERROR');
  assert.strictEqual(json2.status, 'error');
  assert.match(json2.securityProperty, /without false positive/i);

  // Test 3: POST /api/attack/wrong-source-chain
  const res3 = await server.inject({
    method: 'POST',
    url: '/api/attack/wrong-source-chain',
    payload: { destinationChainId: 31338 }
  });
  // Since chains may or may not be live during unit test, outcome should be BLOCKED or ERROR
  assert.strictEqual(res3.statusCode, 200);
  const json3 = res3.json();
  assert.ok(['BLOCKED', 'ERROR'].includes(json3.outcome));
  assert.strictEqual(json3.attackId, 'wrong-source-chain');

  await server.close();
});
