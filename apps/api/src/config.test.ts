import test from 'node:test';
import assert from 'node:assert';
import { SUPPORTED_CHAINS } from '@crossproof/shared';
import { ChainService } from './services/chainService.js';

test('SUPPORTED_CHAINS has consistent local configuration', () => {
  assert.strictEqual(SUPPORTED_CHAINS[31337].id, 31337);
  assert.strictEqual(SUPPORTED_CHAINS[31338].id, 31338);
  assert.ok(SUPPORTED_CHAINS[31337].sourceBridgeAddress?.startsWith('0x'));
  assert.ok(SUPPORTED_CHAINS[31338].destinationVerifierAddress?.startsWith('0x'));
  assert.ok(SUPPORTED_CHAINS[31338].headerOracleAddress?.startsWith('0x'));
  assert.ok(SUPPORTED_CHAINS[31338].receiverAddress?.startsWith('0x'));
});

test('ChainService handles supported and unsupported chains correctly', () => {
  const service = new ChainService();

  // Supported chain 31337 should return public client & config
  const config31337 = service.getChainConfig(31337);
  assert.strictEqual(config31337.id, 31337);
  const client31337 = service.getPublicClient(31337);
  assert.ok(client31337);

  // Unsupported chain 999999 should throw clear error
  assert.throws(() => {
    service.getPublicClient(999999);
  }, /Unsupported or unconfigured chain ID: 999999/);

  assert.throws(() => {
    service.getChainConfig(999999);
  }, /Chain 999999 not found in configuration/);
});
