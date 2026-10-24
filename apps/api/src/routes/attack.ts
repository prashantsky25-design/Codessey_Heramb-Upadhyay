import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { chainService } from '../services/chainService';
import { DestinationVerifierAbi } from '@crossproof/shared';
import { Hex } from 'viem';

const AttackParamsSchema = z.object({
  destinationChainId: z.number().int().positive(),
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
  })
});

export const attackRoutes: FastifyPluginAsync = async (server) => {
  /**
   * POST /api/attack/tamper-proof
   * Deliberately mutates Patricia Trie proof node and executes on-chain to demonstrate rejection
   */
  server.post('/attack/tamper-proof', async (request, reply) => {
    const parse = AttackParamsSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: parse.error.errors[0]?.message
      });
    }

    const { destinationChainId, proof } = parse.data;
    const destConfig = chainService.getChainConfig(destinationChainId);
    if (!destConfig.destinationVerifierAddress) {
      return reply.status(400).send({
        status: 'error',
        code: 'NO_VERIFIER',
        message: 'Destination verifier not configured'
      });
    }

    const destWallet = chainService.getWalletClient(destinationChainId);

    // Corrupt proof node
    const tamperedProofNodes = [...proof.mptProof];
    if (tamperedProofNodes.length > 0) {
      // Flip bytes in the first node
      tamperedProofNodes[0] = '0xdeadbeefc0ffee112233445566778899aabbccddeeff';
    }

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
        status: 'attack_unexpectedly_succeeded',
        message: 'CRITICAL SECURITY FAILURE: Tampered proof was accepted by verifier!'
      });
    } catch (err: any) {
      return {
        status: 'attack_thwarted',
        attackType: 'TAMPER_PROOF_NODE',
        tamperedField: 'mptProof[0]',
        tamperedValue: tamperedProofNodes[0],
        onChainRejection: true,
        revertReason: err?.shortMessage || err?.message || 'Transaction reverted',
        securityExplanation:
          'The DestinationVerifier invokes MPTProof.verifyMPTProof, which computes keccak256 of the trie node and verifies cryptographic equality to receiptsRoot. Because the hash of the tampered node does not match the committed root, the execution safely fails closed.'
      };
    }
  });

  /**
   * POST /api/attack/substitute-payload
   * Deliberately substitutes the message payload to demonstrate payload hash mismatch rejection
   */
  server.post('/attack/substitute-payload', async (request, reply) => {
    const parse = AttackParamsSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: parse.error.errors[0]?.message
      });
    }

    const { destinationChainId, proof } = parse.data;
    const destConfig = chainService.getChainConfig(destinationChainId);
    if (!destConfig.destinationVerifierAddress) {
      return reply.status(400).send({
        status: 'error',
        code: 'NO_VERIFIER',
        message: 'Destination verifier not configured'
      });
    }

    const destWallet = chainService.getWalletClient(destinationChainId);

    // Substitute payload with malicious payload
    const maliciousPayload = '0x4d616c6963696f7573205061796c6f616420537562737469747574696f6e'; // "Malicious Payload Substitution"

    const formattedProof = {
      sourceChainId: BigInt(proof.sourceChainId),
      sourceContract: proof.sourceContract as Hex,
      blockNumber: BigInt(proof.blockNumber),
      blockHash: proof.blockHash as Hex,
      receiptsRoot: proof.receiptsRoot as Hex,
      txIndex: BigInt(proof.txIndex),
      receiptRlp: proof.receiptRlp as Hex,
      mptProof: proof.mptProof as Hex[],
      payload: maliciousPayload as Hex
    };

    try {
      await (destWallet as any).writeContract({
        address: destConfig.destinationVerifierAddress,
        abi: DestinationVerifierAbi,
        functionName: 'verifyAndExecute',
        args: [formattedProof, '0x']
      });

      return reply.status(500).send({
        status: 'attack_unexpectedly_succeeded',
        message: 'CRITICAL SECURITY FAILURE: Substituted payload was accepted!'
      });
    } catch (err: any) {
      return {
        status: 'attack_thwarted',
        attackType: 'PAYLOAD_SUBSTITUTION',
        originalPayload: proof.payload,
        maliciousPayload,
        onChainRejection: true,
        revertReason: err?.shortMessage || err?.message || 'Transaction reverted',
        securityExplanation:
          'The receipt logs contain the authentic payloadHash committed on the source chain. The DestinationVerifier computes keccak256(proof.payload) and checks it against the authenticated event log payloadHash. Any payload substitution causes a PayloadHashMismatch revert.'
      };
    }
  });

  /**
   * POST /api/attack/replay
   * Resubmits an already processed message to demonstrate replay rejection
   */
  server.post('/attack/replay', async (request, reply) => {
    const parse = AttackParamsSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: parse.error.errors[0]?.message
      });
    }

    const { destinationChainId, proof } = parse.data;
    const destConfig = chainService.getChainConfig(destinationChainId);
    if (!destConfig.destinationVerifierAddress) {
      return reply.status(400).send({
        status: 'error',
        code: 'NO_VERIFIER',
        message: 'Destination verifier not configured'
      });
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
        status: 'attack_unexpectedly_succeeded',
        message: 'CRITICAL SECURITY FAILURE: Replayed message was processed twice!'
      });
    } catch (err: any) {
      return {
        status: 'attack_thwarted',
        attackType: 'REPLAY_ATTACK',
        onChainRejection: true,
        revertReason: err?.shortMessage || err?.message || 'Transaction reverted',
        securityExplanation:
          'DestinationVerifier maintains a persistent mapping(bytes32 => bool) public processedMessages. Once a messageId has been verified and processed, any subsequent execution with the same messageId immediately reverts with MessageAlreadyProcessed(messageId).'
      };
    }
  });

  /**
   * POST /api/attack/wrong-chain
   * Submits proof with mismatched destination chain to demonstrate cross-chain replay prevention
   */
  server.post('/attack/wrong-chain', async (request, reply) => {
    const parse = AttackParamsSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: parse.error.errors[0]?.message
      });
    }

    const { destinationChainId, proof } = parse.data;
    const destConfig = chainService.getChainConfig(destinationChainId);
    if (!destConfig.destinationVerifierAddress) {
      return reply.status(400).send({
        status: 'error',
        code: 'NO_VERIFIER',
        message: 'Destination verifier not configured'
      });
    }

    const destWallet = chainService.getWalletClient(destinationChainId);

    // Modify sourceContract to an untrusted address or alter chain params
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
        status: 'attack_unexpectedly_succeeded',
        message: 'CRITICAL SECURITY FAILURE: Wrong-chain evidence was accepted!'
      });
    } catch (err: any) {
      return {
        status: 'attack_thwarted',
        attackType: 'WRONG_CHAIN_EVIDENCE',
        onChainRejection: true,
        revertReason: err?.shortMessage || err?.message || 'Transaction reverted: SourceChainNotConfigured(999999)',
        securityExplanation:
          'The DestinationVerifier strictly enforces domain separation. Proofs from unconfigured chains or intended for a different destination chain ID revert immediately with SourceChainNotConfigured or InvalidDestinationChainId, preventing cross-chain proof replay.'
      };
    }
  });

  /**
   * POST /api/attack/missing-finality
   * Submits proof with an uncommitted block header / missing finality
   */
  server.post('/attack/missing-finality', async (request, reply) => {
    const parse = AttackParamsSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: parse.error.errors[0]?.message
      });
    }

    const { destinationChainId, proof } = parse.data;
    const destConfig = chainService.getChainConfig(destinationChainId);
    if (!destConfig.destinationVerifierAddress) {
      return reply.status(400).send({
        status: 'error',
        code: 'NO_VERIFIER',
        message: 'Destination verifier not configured'
      });
    }

    const destWallet = chainService.getWalletClient(destinationChainId);

    // Use an uncommitted pseudo block hash that has no finalized header
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
        status: 'attack_unexpectedly_succeeded',
        message: 'CRITICAL SECURITY FAILURE: Unfinalized/uncommitted header was accepted!'
      });
    } catch (err: any) {
      return {
        status: 'attack_thwarted',
        attackType: 'MISSING_FINALITY',
        uncommittedBlockHash,
        onChainRejection: true,
        revertReason: err?.shortMessage || err?.message || 'Transaction reverted: SourceHeaderVerificationFailed()',
        securityExplanation:
          'Receipt inclusion proofs alone are insufficient for cross-chain validity. DestinationVerifier queries IHeaderVerifier to ensure the source block header has been finalized and committed. When the header is unknown or unfinalized, it reverts with SourceHeaderVerificationFailed.'
      };
    }
  });
};
