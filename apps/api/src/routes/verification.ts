import { FastifyPluginAsync } from 'fastify';
import {
  PrepareVerificationSchema,
  VerifyProofSchema,
  SubmitVerificationSchema,
  VerificationRecord
} from '@crossproof/shared';
import {
  buildReceiptInclusionProof,
  verifyReceiptInclusionProofLocally
} from '@crossproof/proof';
import { chainService } from '../services/chainService.js';
import { verificationStore } from '../services/verificationStore.js';
import {
  DestinationVerifierAbi,
  DevHeaderOracleAbi
} from '@crossproof/shared';
import { Hash, Hex } from 'viem';

export const verificationRoutes: FastifyPluginAsync = async (server) => {
  /**
   * POST /api/verification/prepare
   * Constructs authentic MPT proof from source chain transaction
   */
  server.post('/verification/prepare', async (request, reply) => {
    const parse = PrepareVerificationSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: parse.error.errors[0]?.message
      });
    }

    const { sourceChainId, txHash, destinationChainId } = parse.data;

    try {
      const sourceClient = chainService.getPublicClient(sourceChainId);

      // Build real MPT inclusion proof
      const proofResult = await buildReceiptInclusionProof(
        sourceClient,
        txHash as Hash
      );

      const targetDestChainId =
        destinationChainId || proofResult.extractedEvent.destinationChainId;

      // Auto-commit source header to DevHeaderOracle if local mode
      const destConfig = chainService.getChainConfig(targetDestChainId);
      let headerValidated = true;
      let headerErrorMsg = 'Committed to Header Verifier';
      if (destConfig.headerOracleAddress) {
        try {
          const destWallet = chainService.getWalletClient(targetDestChainId);
          const destPublic = chainService.getPublicClient(targetDestChainId);

          // Check if already committed
          const isVerified = (await destPublic.readContract({
            address: destConfig.headerOracleAddress,
            abi: DevHeaderOracleAbi,
            functionName: 'verifySourceHeader',
            args: [
              BigInt(sourceChainId),
              BigInt(proofResult.proof.blockNumber),
              proofResult.proof.blockHash,
              proofResult.proof.receiptsRoot,
              '0x'
            ]
          }).catch(() => false)) as boolean;

          if (!isVerified) {
            const commitTx = await (destWallet as any).writeContract({
              address: destConfig.headerOracleAddress,
              abi: DevHeaderOracleAbi,
              functionName: 'commitSourceHeader',
              args: [
                BigInt(sourceChainId),
                BigInt(proofResult.proof.blockNumber),
                proofResult.proof.blockHash,
                proofResult.proof.receiptsRoot
              ]
            });
            await destPublic.waitForTransactionReceipt({ hash: commitTx });
          }
        } catch (oracleErr: any) {
          headerValidated = false;
          headerErrorMsg = oracleErr?.message || 'Header oracle commit failed';
          console.warn('Notice: Header oracle commit skipped or failed:', oracleErr);
        }
      }

      const verificationId = `v-${Date.now()}-${proofResult.extractedEvent.nonce}`;

      return {
        status: 'success',
        verificationId,
        proof: proofResult.proof,
        extractedEvent: {
          ...proofResult.extractedEvent,
          nonce: proofResult.extractedEvent.nonce.toString()
        },
        metrics: proofResult.metrics,
        stages: [
          {
            id: 'tx_found',
            label: 'Source Transaction Found',
            status: 'completed',
            details: `Block #${proofResult.proof.blockNumber}, TxIndex: ${proofResult.proof.txIndex}`
          },
          {
            id: 'receipt_proof_retrieved',
            label: 'Receipt & Trie Proof Constructed',
            status: 'completed',
            details: `${proofResult.metrics.proofNodesCount} Trie nodes, ${proofResult.metrics.totalProofSizeBytes} bytes`
          },
          {
            id: 'inclusion_validated',
            label: 'Inclusion Proof Validated',
            status: 'completed',
            details: `ReceiptsRoot: ${proofResult.proof.receiptsRoot.slice(0, 10)}...`
          },
          {
            id: 'header_finality_validated',
            label: 'Source Header Authenticity Validated',
            status: headerValidated ? 'completed' : 'failed',
            details: headerErrorMsg
          },
          {
            id: 'destination_verifier_called',
            label: 'Destination Verifier Execution',
            status: 'pending'
          },
          {
            id: 'on_chain_confirmed',
            label: 'On-Chain Confirmation',
            status: 'pending'
          }
        ]
      };
    } catch (err: any) {
      return reply.status(500).send({
        status: 'error',
        code: 'PROOF_GENERATION_FAILED',
        message: err?.message || 'Failed to construct cryptographic proof'
      });
    }
  });

  /**
   * POST /api/verification/verify
   * Runs local pre-flight cryptographic checks on the proof before on-chain submission
   */
  server.post('/verification/verify', async (request, reply) => {
    const parse = VerifyProofSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: parse.error.errors[0]?.message
      });
    }

    const { sourceChainId, destinationChainId, proof } = parse.data;

    if (proof.sourceChainId !== sourceChainId) {
      return reply.status(400).send({
        status: 'error',
        code: 'SOURCE_CHAIN_ID_MISMATCH',
        message: `Proof sourceChainId (${proof.sourceChainId}) does not match request sourceChainId (${sourceChainId})`
      });
    }

    if (!proof.blockHash || !proof.receiptsRoot || !proof.receiptRlp || !Array.isArray(proof.mptProof)) {
      return reply.status(400).send({
        status: 'error',
        code: 'INVALID_PROOF_STRUCTURE',
        message: 'Proof is missing required fields (blockHash, receiptsRoot, receiptRlp, or mptProof)'
      });
    }

    try {
      // 1. Check MPT receipt inclusion
      const isMptValid = await verifyReceiptInclusionProofLocally(
        proof.receiptsRoot as Hex,
        proof.txIndex,
        proof.receiptRlp as Hex,
        proof.mptProof as Hex[]
      );

      // 2. Check destination verifier state
      const destConfig = chainService.getChainConfig(parse.data.destinationChainId);
      let isHeaderCommitted = false;

      if (destConfig.headerOracleAddress) {
        const destPublic = chainService.getPublicClient(parse.data.destinationChainId);
        try {
          isHeaderCommitted = (await destPublic.readContract({
            address: destConfig.headerOracleAddress,
            abi: DevHeaderOracleAbi,
            functionName: 'verifySourceHeader',
            args: [
              BigInt(proof.sourceChainId),
              BigInt(proof.blockNumber),
              proof.blockHash as Hex,
              proof.receiptsRoot as Hex,
              '0x'
            ]
          })) as boolean;
        } catch {
          isHeaderCommitted = false;
        }
      }

      const allValid = isMptValid && isHeaderCommitted;

      return {
        status: 'success',
        valid: allValid,
        checks: {
          mptInclusionValid: isMptValid,
          headerAuthenticityValid: isHeaderCommitted,
          payloadFormatValid: proof.payload.startsWith('0x')
        }
      };
    } catch (err: any) {
      return reply.status(500).send({
        status: 'error',
        code: 'VERIFICATION_CHECK_FAILED',
        message: err?.message || 'Verification check failed'
      });
    }
  });

  /**
   * POST /api/verification/submit
   * Submits proof to DestinationVerifier on destination blockchain
   */
  server.post('/verification/submit', async (request, reply) => {
    const parse = SubmitVerificationSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: parse.error.errors[0]?.message
      });
    }

    const { sourceChainId, destinationChainId, sourceTxHash, simulateTamper } =
      parse.data;
    let proof = { ...parse.data.proof };
    const zeroMessageId = '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex;
    const proofMessageId = (proof.messageId || zeroMessageId) as Hex;
    const proofPayloadHash = (proof.payloadHash || '0x') as Hex;

    if (proof.sourceChainId !== sourceChainId) {
      return reply.status(400).send({
        status: 'error',
        code: 'SOURCE_CHAIN_ID_MISMATCH',
        message: `Proof sourceChainId (${proof.sourceChainId}) does not match request sourceChainId (${sourceChainId})`
      });
    }

    if (!proof.blockHash || !proof.receiptsRoot || !proof.receiptRlp || !Array.isArray(proof.mptProof)) {
      return reply.status(400).send({
        status: 'error',
        code: 'INVALID_PROOF_STRUCTURE',
        message: 'Proof is missing required fields (blockHash, receiptsRoot, receiptRlp, or mptProof)'
      });
    }

    // Deliberate attack simulations
    if (simulateTamper === 'proof_node') {
      proof.mptProof = ['0xdeadbeef1234'];
    } else if (simulateTamper === 'payload') {
      proof.payload = '0xdeadbeefbadf00d';
    }

    const destConfig = chainService.getChainConfig(destinationChainId);
    if (!destConfig.destinationVerifierAddress) {
      return reply.status(400).send({
        status: 'error',
        code: 'NO_VERIFIER_CONFIGURED',
        message: `Destination verifier not configured for chain ${destinationChainId}`
      });
    }

    const destWallet = chainService.getWalletClient(destinationChainId);
    const destPublic = chainService.getPublicClient(destinationChainId);

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

    const verificationId = `v-${Date.now()}`;

    try {
      // Execute verifyAndExecute on destination verifier
      const txHash = await (destWallet as any).writeContract({
        address: destConfig.destinationVerifierAddress,
        abi: DestinationVerifierAbi,
        functionName: 'verifyAndExecute',
        args: [formattedProof, '0x']
      });

      const receipt = await destPublic.waitForTransactionReceipt({
        hash: txHash,
        timeout: 25_000
      });

      if (receipt.status !== 'success') {
        const record: VerificationRecord = {
          verificationId,
          messageId: proofMessageId,
          sourceChainId,
          sourceContract: proof.sourceContract as Hex,
          destinationChainId,
          destinationReceiver: destConfig.receiverAddress || ('0x0' as Hex),
          sourceTxHash: sourceTxHash as Hex,
          destinationTxHash: receipt.transactionHash,
          blockNumber: proof.blockNumber,
          txIndex: proof.txIndex,
          payload: proof.payload as Hex,
          payloadHash: proofPayloadHash,
          verifiedAt: Math.floor(Date.now() / 1000),
          gasUsed: receipt.gasUsed.toString(),
          status: 'REJECTED',
          rejectionReason: 'Destination transaction reverted on-chain',
          trustMode: 'MODE_A_LOCAL_ORACLE',
          proof: proof as VerificationRecord['proof']
        };
        verificationStore.save(record);

        return reply.status(422).send({
          status: 'error',
          code: 'EXECUTION_REVERTED',
          message: 'Destination transaction reverted on-chain',
          record
        });
      }

      // Query messageId from verifier record or logs
        const record: VerificationRecord = {
          verificationId,
          messageId: proofMessageId,
        sourceChainId,
        sourceContract: proof.sourceContract as Hex,
        destinationChainId,
        destinationReceiver: destConfig.receiverAddress || ('0x0' as Hex),
        sourceTxHash: sourceTxHash as Hex,
        destinationTxHash: receipt.transactionHash,
        blockNumber: proof.blockNumber,
        txIndex: proof.txIndex,
        payload: proof.payload as Hex,
          payloadHash: proofPayloadHash,
        verifiedAt: Math.floor(Date.now() / 1000),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 'success' ? 'VERIFIED' : 'REJECTED',
          trustMode: 'MODE_A_LOCAL_ORACLE',
          proof: proof as VerificationRecord['proof']
      };

      // Extract MessageVerified event log if present
      for (const log of receipt.logs) {
        if (
          log.topics[0]?.toLowerCase() ===
          '0x759e612984920b72c694a919fb9db4685ffcb6a142daecaa47ae07f2a8909dc2'.toLowerCase()
        ) {
          record.messageId = log.topics[1] as Hex;
        }
      }

      verificationStore.save(record);

      return {
        status: 'success',
        verificationId,
        destinationTxHash: receipt.transactionHash,
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed.toString(),
        executionStatus: receipt.status,
        record
      };
    } catch (err: any) {
      // Revert caught
        const record: VerificationRecord = {
          verificationId,
          messageId: proofMessageId,
        sourceChainId,
        sourceContract: proof.sourceContract as Hex,
        destinationChainId,
        destinationReceiver: destConfig.receiverAddress || ('0x0' as Hex),
        sourceTxHash: sourceTxHash as Hex,
        blockNumber: proof.blockNumber,
        txIndex: proof.txIndex,
        payload: proof.payload as Hex,
          payloadHash: proofPayloadHash,
        verifiedAt: Math.floor(Date.now() / 1000),
        status: 'REJECTED',
        rejectionReason: err?.shortMessage || err?.message || 'On-chain execution reverted',
          trustMode: 'MODE_A_LOCAL_ORACLE',
          proof: proof as VerificationRecord['proof']
      };

      verificationStore.save(record);

      return reply.status(422).send({
        status: 'error',
        code: 'EXECUTION_REVERTED',
        message: err?.shortMessage || err?.message || 'Transaction reverted on destination verifier',
        details: err?.metaMessages || err?.message,
        record
      });
    }
  });

  /**
   * GET /api/verification/:verificationId
   */
  server.get<{ Params: { verificationId: string } }>(
    '/verification/:verificationId',
    async (request, reply) => {
      const { verificationId } = request.params;
      const record =
        verificationStore.get(verificationId) ||
        verificationStore.getByMessageId(verificationId) ||
        verificationStore.getBySourceTxHash(verificationId);

      if (!record) {
        return reply.status(404).send({
          status: 'error',
          code: 'NOT_FOUND',
          message: `Verification record ${verificationId} not found`
        });
      }

      return {
        status: 'success',
        record
      };
    }
  );

  /**
   * GET /api/verification/history
   */
  server.get<{
    Querystring: {
      sourceChainId?: string;
      destinationChainId?: string;
      status?: string;
      search?: string;
    };
  }>('/verification/history', async (request) => {
    const { sourceChainId, destinationChainId, status, search } = request.query;

    const records = verificationStore.list({
      sourceChainId: sourceChainId ? Number(sourceChainId) : undefined,
      destinationChainId: destinationChainId ? Number(destinationChainId) : undefined,
      status,
      search
    });

    return {
      status: 'success',
      count: records.length,
      records
    };
  });
};
