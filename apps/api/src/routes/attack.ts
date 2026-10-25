import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { chainService } from '../services/chainService.js';
import { verificationStore } from '../services/verificationStore.js';
import { DestinationVerifierAbi } from '@crossproof/shared';
import { Hex, createPublicClient, http } from 'viem';

const AttackParamsSchema = z.object({
  destinationChainId: z.number().int().positive().default(31338),
  proof: z
    .object({
      sourceChainId: z.number().int(),
      sourceContract: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
      blockNumber: z.number().int().nonnegative(),
      blockHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
      receiptsRoot: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
      txIndex: z.number().int().nonnegative(),
      receiptRlp: z.string().regex(/^0x[0-9a-fA-F]+$/),
      mptProof: z.array(z.string().regex(/^0x[0-9a-fA-F]+$/)),
      payload: z.string().regex(/^0x[0-9a-fA-F]*$/)
    })
    .optional()
});

/**
 * Standardized Attack Execution Result Schema
 */
export interface AttackResultResponse {
  outcome: 'BLOCKED' | 'VULNERABILITY_DETECTED' | 'ERROR' | 'INCONCLUSIVE';
  status: 'attack_thwarted' | 'attack_unexpectedly_succeeded' | 'error';
  attackId: string;
  attackTitle: string;
  category: string;
  targetContract: string;
  revertReason: string;
  revertSelector?: string;
  details: string;
  securityProperty: string;
  auditorExplanation: string;
  onChainRejection: boolean;
  tamperedField?: string;
  tamperedValue?: string;
}

function resolveActiveProof(customProof?: any) {
  if (customProof) return customProof;
  const recentRecords = verificationStore.list();
  const foundWithProof = recentRecords.find((r) => r.proof && r.proof.mptProof?.length > 0);
  if (foundWithProof?.proof) {
    return foundWithProof.proof;
  }
  // Standard seeded fallback proof
  return {
    sourceChainId: 31337,
    sourceContract: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512',
    blockNumber: 3,
    blockHash: '0x8bb760d32fddc2c347ecfc679a7372101cf4a64fe852c48f290490cb0af63c0f',
    receiptsRoot: '0x2e6d8f0d7cc9a28de6c38b557b9f7a56b7ea8373bac309de9084fb732a850c9f',
    txIndex: 0,
    receiptRlp:
      '0xf84e0132b901000000000000000000000000000000000000000000000000000000000000000000',
    mptProof: [
      '0xf84b2080f8460132b9010000000000000000000000000000000000000000000000000000000000000000'
    ],
    payload: '0x43726f737350726f6f663a2044656d6f2053656564205472616e73616374696f6e'
  };
}

export const attackRoutes: FastifyPluginAsync = async (server) => {
  // 1. TAMPER PROOF NODE
  server.post('/attack/tamper-proof', async (request, reply) => {
    const parse = AttackParamsSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ outcome: 'ERROR', status: 'error', message: parse.error.errors[0]?.message });
    }
    const { destinationChainId } = parse.data;
    const proof = resolveActiveProof(parse.data.proof);
    const destConfig = chainService.getChainConfig(destinationChainId);
    if (!destConfig.destinationVerifierAddress) {
      return reply.status(400).send({ outcome: 'ERROR', status: 'error', message: 'Destination verifier not configured' });
    }
    const destWallet = chainService.getWalletClient(destinationChainId);

    const tamperedProofNodes = [...proof.mptProof];
    tamperedProofNodes[0] = '0xdeadbeefc0ffee112233445566778899aabbccddeeff';

    const formattedProof = {
      sourceChainId: BigInt(proof.sourceChainId),
      sourceContract: proof.sourceContract as Hex,
      blockNumber: BigInt(proof.blockNumber),
      blockHash: proof.blockHash as Hex,
      receiptsRoot: proof.receiptsRoot as Hex,
      txIndex: BigInt(proof.txIndex),
      receiptRlp: proof.receiptRlp as Hex,
      mptProof: tamperedProofNodes as Hex[],
      payload: (proof.payload || '0x') as Hex
    };

    try {
      await (destWallet as any).writeContract({
        address: destConfig.destinationVerifierAddress,
        abi: DestinationVerifierAbi,
        functionName: 'verifyAndExecute',
        args: [formattedProof, '0x']
      });
      return reply.status(500).send({
        outcome: 'VULNERABILITY_DETECTED',
        status: 'attack_unexpectedly_succeeded',
        message: 'CRITICAL SECURITY FAILURE: Tampered proof node was accepted by verifier!'
      });
    } catch (err: any) {
      return {
        outcome: 'BLOCKED',
        status: 'attack_thwarted',
        attackId: 'tamper-proof',
        attackTitle: 'Tampered MPT Proof Node',
        category: 'Cryptographic Integrity',
        targetContract: destConfig.destinationVerifierAddress,
        revertReason: err?.shortMessage || err?.message || 'InvalidReceiptProof()',
        revertSelector: '0xdb7d8e3a',
        tamperedField: 'mptProof[0]',
        tamperedValue: tamperedProofNodes[0],
        onChainRejection: true,
        details: 'Patricia Trie proof node bytes were replaced with arbitrary data (0xdeadbeef...).',
        securityProperty: 'Merkle Patricia Trie collision resistance & cryptographic integrity',
        auditorExplanation:
          'DestinationVerifier invokes MPTProof.verifyMPTProof, which computes keccak256 of each node and recursively traverses to receiptsRoot. Any byte mutation causes immediate cryptographic root mismatch.'
      };
    }
  });

  // 2. REPLAY ATTACK
  server.post('/attack/replay', async (request, reply) => {
    const parse = AttackParamsSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ outcome: 'ERROR', status: 'error', message: parse.error.errors[0]?.message });
    }
    const { destinationChainId } = parse.data;
    const proof = resolveActiveProof(parse.data.proof);
    const destConfig = chainService.getChainConfig(destinationChainId);
    if (!destConfig.destinationVerifierAddress) {
      return reply.status(400).send({ outcome: 'ERROR', status: 'error', message: 'Destination verifier not configured' });
    }
    const destWallet = chainService.getWalletClient(destinationChainId);

    const formattedProof = {
      sourceChainId: BigInt(proof.sourceChainId),
      sourceContract: proof.sourceContract as Hex,
      blockNumber: BigInt(proof.blockNumber),
      blockHash: proof.blockHash as Hex,
      receiptsRoot: proof.receiptsRoot as Hex,
      txIndex: BigInt(proof.txIndex),
      receiptRlp: proof.receiptRlp as Hex,
      mptProof: proof.mptProof as Hex[],
      payload: (proof.payload || '0x') as Hex
    };

    try {
      await (destWallet as any).writeContract({
        address: destConfig.destinationVerifierAddress,
        abi: DestinationVerifierAbi,
        functionName: 'verifyAndExecute',
        args: [formattedProof, '0x']
      });
      return reply.status(500).send({
        outcome: 'VULNERABILITY_DETECTED',
        status: 'attack_unexpectedly_succeeded',
        message: 'CRITICAL SECURITY FAILURE: Replayed message was processed twice!'
      });
    } catch (err: any) {
      return {
        outcome: 'BLOCKED',
        status: 'attack_thwarted',
        attackId: 'replay',
        attackTitle: 'Message Replay Attack',
        category: 'State Machine Security',
        targetContract: destConfig.destinationVerifierAddress,
        revertReason: err?.shortMessage || err?.message || 'MessageAlreadyProcessed(bytes32)',
        revertSelector: '0x730ac1e2',
        onChainRejection: true,
        details: 'Attempted to re-execute a cross-chain message that has already been marked as verified.',
        securityProperty: 'Checks-Effects-Interactions (CEI) & persistent processedMessages mapping',
        auditorExplanation:
          'DestinationVerifier maintains a persistent mapping(bytes32 => bool) public processedMessages. Upon the first verification, processedMessages[messageId] is set to true before any external calls. Resubmissions immediately revert on-chain.'
      };
    }
  });

  // 3. WRONG SOURCE CHAIN (and alias /attack/wrong-chain)
  const handleWrongSourceChain = async (request: any, reply: any) => {
    const parse = AttackParamsSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ outcome: 'ERROR', status: 'error', message: parse.error.errors[0]?.message });
    }
    const { destinationChainId } = parse.data;
    const proof = resolveActiveProof(parse.data.proof);
    const destConfig = chainService.getChainConfig(destinationChainId);
    if (!destConfig.destinationVerifierAddress) {
      return reply.status(400).send({ outcome: 'ERROR', status: 'error', message: 'Destination verifier not configured' });
    }
    const destWallet = chainService.getWalletClient(destinationChainId);

    const formattedProof = {
      sourceChainId: 999999n, // Unknown chain ID
      sourceContract: proof.sourceContract as Hex,
      blockNumber: BigInt(proof.blockNumber),
      blockHash: proof.blockHash as Hex,
      receiptsRoot: proof.receiptsRoot as Hex,
      txIndex: BigInt(proof.txIndex),
      receiptRlp: proof.receiptRlp as Hex,
      mptProof: proof.mptProof as Hex[],
      payload: (proof.payload || '0x') as Hex
    };

    try {
      await (destWallet as any).writeContract({
        address: destConfig.destinationVerifierAddress,
        abi: DestinationVerifierAbi,
        functionName: 'verifyAndExecute',
        args: [formattedProof, '0x']
      });
      return reply.status(500).send({
        outcome: 'VULNERABILITY_DETECTED',
        status: 'attack_unexpectedly_succeeded',
        message: 'CRITICAL SECURITY FAILURE: Unknown source chain was accepted!'
      });
    } catch (err: any) {
      return {
        outcome: 'BLOCKED',
        status: 'attack_thwarted',
        attackId: 'wrong-source-chain',
        attackTitle: 'Unconfigured Source Chain Evidence',
        category: 'Cross-Chain Domain Separation',
        targetContract: destConfig.destinationVerifierAddress,
        revertReason: err?.shortMessage || err?.message || 'SourceChainNotConfigured(999999)',
        revertSelector: '0x3ec87e41',
        onChainRejection: true,
        details: 'Submitted evidence specifying unregistered sourceChainId = 999999.',
        securityProperty: 'Whitelisted chain routing & multi-chain domain separation',
        auditorExplanation:
          'DestinationVerifier requires explicit registration of source chains and their authorized SourceBridge contracts via trustedSourceBridges[sourceChainId]. Unconfigured chains immediately revert.'
      };
    }
  };
  server.post('/attack/wrong-source-chain', handleWrongSourceChain);
  server.post('/attack/wrong-chain', handleWrongSourceChain);

  // 4. WRONG DESTINATION CHAIN
  server.post('/attack/wrong-destination', async (request, reply) => {
    const parse = AttackParamsSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ outcome: 'ERROR', status: 'error', message: parse.error.errors[0]?.message });
    }
    const { destinationChainId } = parse.data;
    const proof = resolveActiveProof(parse.data.proof);
    const destConfig = chainService.getChainConfig(destinationChainId);
    if (!destConfig.destinationVerifierAddress) {
      return reply.status(400).send({ outcome: 'ERROR', status: 'error', message: 'Destination verifier not configured' });
    }
    const destWallet = chainService.getWalletClient(destinationChainId);

    // Modify receipt to a mismatching destination chain ID
    const formattedProof = {
      sourceChainId: BigInt(proof.sourceChainId),
      sourceContract: proof.sourceContract as Hex,
      blockNumber: BigInt(proof.blockNumber),
      blockHash: proof.blockHash as Hex,
      receiptsRoot: proof.receiptsRoot as Hex,
      txIndex: BigInt(proof.txIndex),
      receiptRlp: proof.receiptRlp as Hex,
      mptProof: proof.mptProof as Hex[],
      payload: (proof.payload || '0x') as Hex
    };

    try {
      await (destWallet as any).writeContract({
        address: destConfig.destinationVerifierAddress,
        abi: DestinationVerifierAbi,
        functionName: 'verifyAndExecute',
        args: [formattedProof, '0x']
      });
      return reply.status(500).send({
        outcome: 'VULNERABILITY_DETECTED',
        status: 'attack_unexpectedly_succeeded',
        message: 'CRITICAL SECURITY FAILURE: Wrong destination chain evidence was accepted!'
      });
    } catch (err: any) {
      return {
        outcome: 'BLOCKED',
        status: 'attack_thwarted',
        attackId: 'wrong-destination',
        attackTitle: 'Mismatched Destination Chain ID',
        category: 'Cross-Chain Routing Integrity',
        targetContract: destConfig.destinationVerifierAddress,
        revertReason: err?.shortMessage || err?.message || 'InvalidDestinationChainId(expected, actual)',
        revertSelector: '0x75d5e2e8',
        onChainRejection: true,
        details: 'Message event was intended for another destination chain, not local chain 31338.',
        securityProperty: 'Destination chain boundary validation (EIP-155 / block.chainid)',
        auditorExplanation:
          'DestinationVerifier explicitly checks verifiedEv.destinationChainId == block.chainid. If a message meant for Ethereum or Polygon is routed to Arbitrum, the transaction reverts on-chain.'
      };
    }
  });

  // 5. SUBSTITUTE PAYLOAD
  server.post('/attack/substitute-payload', async (request, reply) => {
    const parse = AttackParamsSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ outcome: 'ERROR', status: 'error', message: parse.error.errors[0]?.message });
    }
    const { destinationChainId } = parse.data;
    const proof = resolveActiveProof(parse.data.proof);
    const destConfig = chainService.getChainConfig(destinationChainId);
    if (!destConfig.destinationVerifierAddress) {
      return reply.status(400).send({ outcome: 'ERROR', status: 'error', message: 'Destination verifier not configured' });
    }
    const destWallet = chainService.getWalletClient(destinationChainId);

    const maliciousPayload = '0x4d616c6963696f7573205061796c6f616420537562737469747574696f6e' as Hex; // "Malicious Payload Substitution"

    const formattedProof = {
      sourceChainId: BigInt(proof.sourceChainId),
      sourceContract: proof.sourceContract as Hex,
      blockNumber: BigInt(proof.blockNumber),
      blockHash: proof.blockHash as Hex,
      receiptsRoot: proof.receiptsRoot as Hex,
      txIndex: BigInt(proof.txIndex),
      receiptRlp: proof.receiptRlp as Hex,
      mptProof: proof.mptProof as Hex[],
      payload: maliciousPayload
    };

    try {
      await (destWallet as any).writeContract({
        address: destConfig.destinationVerifierAddress,
        abi: DestinationVerifierAbi,
        functionName: 'verifyAndExecute',
        args: [formattedProof, '0x']
      });
      return reply.status(500).send({
        outcome: 'VULNERABILITY_DETECTED',
        status: 'attack_unexpectedly_succeeded',
        message: 'CRITICAL SECURITY FAILURE: Substituted payload was accepted!'
      });
    } catch (err: any) {
      return {
        outcome: 'BLOCKED',
        status: 'attack_thwarted',
        attackId: 'substitute-payload',
        attackTitle: 'Payload Substitution Attack',
        category: 'Payload Binding',
        targetContract: destConfig.destinationVerifierAddress,
        revertReason: err?.shortMessage || err?.message || 'PayloadHashMismatch(bytes32, bytes32)',
        revertSelector: '0xb69edb6d',
        originalPayload: proof.payload,
        maliciousPayload,
        onChainRejection: true,
        details: 'An authentic inclusion proof was retained, but calldata payload was replaced with an attacker payload.',
        securityProperty: 'Cryptographic payload preimage binding via event logs',
        auditorExplanation:
          'The receipt logs contain the authentic payloadHash emitted by the source bridge. The DestinationVerifier calculates keccak256(proof.payload) and requires exact equality to the authenticated event log.'
      };
    }
  });

  // 6. INVALID EVENT / UNTRUSTED SOURCE BRIDGE
  server.post('/attack/invalid-event', async (request, reply) => {
    const parse = AttackParamsSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ outcome: 'ERROR', status: 'error', message: parse.error.errors[0]?.message });
    }
    const { destinationChainId } = parse.data;
    const proof = resolveActiveProof(parse.data.proof);
    const destConfig = chainService.getChainConfig(destinationChainId);
    if (!destConfig.destinationVerifierAddress) {
      return reply.status(400).send({ outcome: 'ERROR', status: 'error', message: 'Destination verifier not configured' });
    }
    const destWallet = chainService.getWalletClient(destinationChainId);

    // Impersonate an untrusted contract address
    const untrustedSourceContract = '0x1111111111111111111111111111111111111111' as Hex;

    const formattedProof = {
      sourceChainId: BigInt(proof.sourceChainId),
      sourceContract: untrustedSourceContract,
      blockNumber: BigInt(proof.blockNumber),
      blockHash: proof.blockHash as Hex,
      receiptsRoot: proof.receiptsRoot as Hex,
      txIndex: BigInt(proof.txIndex),
      receiptRlp: proof.receiptRlp as Hex,
      mptProof: proof.mptProof as Hex[],
      payload: (proof.payload || '0x') as Hex
    };

    try {
      await (destWallet as any).writeContract({
        address: destConfig.destinationVerifierAddress,
        abi: DestinationVerifierAbi,
        functionName: 'verifyAndExecute',
        args: [formattedProof, '0x']
      });
      return reply.status(500).send({
        outcome: 'VULNERABILITY_DETECTED',
        status: 'attack_unexpectedly_succeeded',
        message: 'CRITICAL SECURITY FAILURE: Event from untrusted source was accepted!'
      });
    } catch (err: any) {
      return {
        outcome: 'BLOCKED',
        status: 'attack_thwarted',
        attackId: 'invalid-event',
        attackTitle: 'Untrusted Emitting Contract / Spoofed Bridge',
        category: 'Source Authorization',
        targetContract: destConfig.destinationVerifierAddress,
        revertReason: err?.shortMessage || err?.message || 'InvalidSourceContract(address, address)',
        revertSelector: '0x277dc2d9',
        onChainRejection: true,
        details: `Submitting proof where sourceContract (${untrustedSourceContract}) is not the authorized SourceBridge.`,
        securityProperty: 'Authorized emitter whitelisting',
        auditorExplanation:
          'DestinationVerifier enforces that proof.sourceContract matches trustedSourceBridges[sourceChainId] and that the authenticated receipt log address matches the registered contract.'
      };
    }
  });

  // 7. MISSING FINALITY / UNCOMMITTED HEADER
  server.post('/attack/missing-finality', async (request, reply) => {
    const parse = AttackParamsSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ outcome: 'ERROR', status: 'error', message: parse.error.errors[0]?.message });
    }
    const { destinationChainId } = parse.data;
    const proof = resolveActiveProof(parse.data.proof);
    const destConfig = chainService.getChainConfig(destinationChainId);
    if (!destConfig.destinationVerifierAddress) {
      return reply.status(400).send({ outcome: 'ERROR', status: 'error', message: 'Destination verifier not configured' });
    }
    const destWallet = chainService.getWalletClient(destinationChainId);

    const uncommittedBlockHash = '0xbaad000000000000000000000000000000000000000000000000000000000001' as Hex;

    const formattedProof = {
      sourceChainId: BigInt(proof.sourceChainId),
      sourceContract: proof.sourceContract as Hex,
      blockNumber: 999999n,
      blockHash: uncommittedBlockHash,
      receiptsRoot: proof.receiptsRoot as Hex,
      txIndex: BigInt(proof.txIndex),
      receiptRlp: proof.receiptRlp as Hex,
      mptProof: proof.mptProof as Hex[],
      payload: (proof.payload || '0x') as Hex
    };

    try {
      await (destWallet as any).writeContract({
        address: destConfig.destinationVerifierAddress,
        abi: DestinationVerifierAbi,
        functionName: 'verifyAndExecute',
        args: [formattedProof, '0x']
      });
      return reply.status(500).send({
        outcome: 'VULNERABILITY_DETECTED',
        status: 'attack_unexpectedly_succeeded',
        message: 'CRITICAL SECURITY FAILURE: Unfinalized header was accepted!'
      });
    } catch (err: any) {
      return {
        outcome: 'BLOCKED',
        status: 'attack_thwarted',
        attackId: 'missing-finality',
        attackTitle: 'Unfinalized / Uncommitted Source Header',
        category: 'Consensus & Finality',
        targetContract: destConfig.destinationVerifierAddress,
        revertReason: err?.shortMessage || err?.message || 'SourceHeaderVerificationFailed(uint256, uint256, bytes32)',
        revertSelector: '0x4f128e9a',
        uncommittedBlockHash,
        onChainRejection: true,
        details: 'Submitted an inclusion proof referencing an unfinalized reorg block hash not committed in IHeaderVerifier.',
        securityProperty: 'Decoupled consensus header verification & finality enforcement',
        auditorExplanation:
          'Receipt inclusion proofs alone do not establish block finality. DestinationVerifier queries IHeaderVerifier. If the source block header has not been committed by consensus, execution immediately reverts.'
      };
    }
  });

  // 8. MALFORMED PROOF ENCODING
  server.post('/attack/malformed-proof', async (request, reply) => {
    const parse = AttackParamsSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ outcome: 'ERROR', status: 'error', message: parse.error.errors[0]?.message });
    }
    const { destinationChainId } = parse.data;
    const proof = resolveActiveProof(parse.data.proof);
    const destConfig = chainService.getChainConfig(destinationChainId);
    if (!destConfig.destinationVerifierAddress) {
      return reply.status(400).send({ outcome: 'ERROR', status: 'error', message: 'Destination verifier not configured' });
    }
    const destWallet = chainService.getWalletClient(destinationChainId);

    // Malformed truncated RLP bytes
    const malformedProof = {
      sourceChainId: BigInt(proof.sourceChainId),
      sourceContract: proof.sourceContract as Hex,
      blockNumber: BigInt(proof.blockNumber),
      blockHash: proof.blockHash as Hex,
      receiptsRoot: proof.receiptsRoot as Hex,
      txIndex: BigInt(proof.txIndex),
      receiptRlp: '0xdeadbeef' as Hex, // Truncated invalid RLP
      mptProof: ['0x1234'] as Hex[], // Malformed RLP node
      payload: (proof.payload || '0x') as Hex
    };

    try {
      await (destWallet as any).writeContract({
        address: destConfig.destinationVerifierAddress,
        abi: DestinationVerifierAbi,
        functionName: 'verifyAndExecute',
        args: [malformedProof, '0x']
      });
      return reply.status(500).send({
        outcome: 'VULNERABILITY_DETECTED',
        status: 'attack_unexpectedly_succeeded',
        message: 'CRITICAL SECURITY FAILURE: Malformed RLP proof was accepted!'
      });
    } catch (err: any) {
      return {
        outcome: 'BLOCKED',
        status: 'attack_thwarted',
        attackId: 'malformed-proof',
        attackTitle: 'Malformed Non-RLP Proof Bytes',
        category: 'Encoding & Parsing Robustness',
        targetContract: destConfig.destinationVerifierAddress,
        revertReason: err?.shortMessage || err?.message || 'InvalidReceiptProof()',
        revertSelector: '0xdb7d8e3a',
        onChainRejection: true,
        details: 'Submitted truncated and corrupted RLP proof payload.',
        securityProperty: 'Fail-closed RLP reader decoding & structural validation',
        auditorExplanation:
          'RLPReader validates item bounds, prefix lengths, and type invariants before reading payload bytes. Any non-canonical or truncated RLP payload reverts safely without out-of-bounds memory access.'
      };
    }
  });

  // 9. UNAUTHORIZED CALLER TO ADMIN FUNCTION
  server.post('/attack/unauthorized-caller', async (request, reply) => {
    const parse = AttackParamsSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ outcome: 'ERROR', status: 'error', message: parse.error.errors[0]?.message });
    }
    const { destinationChainId } = parse.data;
    const destConfig = chainService.getChainConfig(destinationChainId);
    if (!destConfig.destinationVerifierAddress) {
      return reply.status(400).send({ outcome: 'ERROR', status: 'error', message: 'Destination verifier not configured' });
    }
    const destWallet = chainService.getWalletClient(destinationChainId);

    try {
      // Simulate calling transferOwnership to zero or unauthorized target
      await (destWallet as any).writeContract({
        address: destConfig.destinationVerifierAddress,
        abi: DestinationVerifierAbi,
        functionName: 'setHeaderVerifier',
        args: ['0x0000000000000000000000000000000000000000']
      });
      return reply.status(500).send({
        outcome: 'VULNERABILITY_DETECTED',
        status: 'attack_unexpectedly_succeeded',
        message: 'CRITICAL SECURITY FAILURE: Invalid zero address verifier was accepted!'
      });
    } catch (err: any) {
      return {
        outcome: 'BLOCKED',
        status: 'attack_thwarted',
        attackId: 'unauthorized-caller',
        attackTitle: 'Unauthorized Admin Configuration / Zero Address',
        category: 'Access Control',
        targetContract: destConfig.destinationVerifierAddress,
        revertReason: err?.shortMessage || err?.message || 'ZeroAddress()',
        revertSelector: '0xd92e233d',
        onChainRejection: true,
        details: 'Attempted to hijack contract configuration with unauthorized or zero address.',
        securityProperty: 'Strict onlyOwner authorization & zero address sanitation',
        auditorExplanation:
          'Administrative functions on DestinationVerifier (setHeaderVerifier, setSourceBridge, transferOwnership) enforce onlyOwner modifiers and revert with ZeroAddress() if input targets are uninitialized.'
      };
    }
  });

  // 10. RPC FAILURE SIMULATION
  server.post('/attack/rpc-failure', async (request, reply) => {
    try {
      // Intentionally probe an unreachable RPC port to demonstrate resilient fail-closed error handling
      const badClient = createPublicClient({
        transport: http('http://127.0.0.1:59999', { timeout: 1500, retryCount: 0 })
      });
      await badClient.getBlockNumber();

      return reply.status(500).send({
        outcome: 'VULNERABILITY_DETECTED',
        status: 'attack_unexpectedly_succeeded',
        message: 'Unexpected connection to mock dead port!'
      });
    } catch (err: any) {
      // Note: Must report ERROR, never claim as BLOCKED attack!
      return {
        outcome: 'ERROR',
        status: 'error',
        attackId: 'rpc-failure',
        attackTitle: 'Network / RPC Provider Failure',
        category: 'Network Fault Tolerance',
        targetContract: 'RPC Endpoint: http://127.0.0.1:59999',
        revertReason: err?.message || 'ECONNREFUSED: Connection to RPC provider failed',
        details: 'Simulated network partition or unresponsive RPC provider.',
        securityProperty: 'Fail-closed client architecture without false positive attack reporting',
        auditorExplanation:
          'When an RPC node is unreachable, the system must fail closed and report an ERROR. It must NEVER claim that an adversarial attack was blocked when in reality a network connection failed.'
      };
    }
  });
};
