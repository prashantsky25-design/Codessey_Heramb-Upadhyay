import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { chainService } from '../services/chainService';
import { decodeEventLog, Hash, Hex } from 'viem';
import { SourceBridgeAbi, TransactionHashSchema } from '@crossproof/shared';

const GetTxParamsSchema = z.object({
  chainId: z.string().transform((v) => Number(v)),
  txHash: TransactionHashSchema
});

export const transactionRoutes: FastifyPluginAsync = async (server) => {
  server.get<{ Params: { chainId: string; txHash: string } }>(
    '/transactions/:chainId/:txHash',
    async (request, reply) => {
      const parseResult = GetTxParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({
          status: 'error',
          code: 'INVALID_INPUT',
          message: parseResult.error.errors[0]?.message || 'Invalid parameters'
        });
      }

      const { chainId, txHash } = parseResult.data;

      try {
        const client = chainService.getPublicClient(chainId);

        // Fetch transaction and receipt
        const [tx, receipt] = await Promise.all([
          client.getTransaction({ hash: txHash as Hash }),
          client.getTransactionReceipt({ hash: txHash as Hash })
        ]);

        if (!tx || !receipt) {
          return reply.status(404).send({
            status: 'error',
            code: 'TRANSACTION_NOT_FOUND',
            message: `Transaction ${txHash} not found on chain ${chainId}`
          });
        }

        // Look for MessageDispatched event
        let dispatchedMessage = null;
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: SourceBridgeAbi,
              data: log.data,
              topics: log.topics
            });
            if (decoded.eventName === 'MessageDispatched') {
              const args: any = decoded.args;
              dispatchedMessage = {
                messageId: args.messageId,
                sourceChainId: Number(args.sourceChainId),
                destinationChainId: Number(args.destinationChainId),
                sourceContract: args.sourceContract,
                destinationReceiver: args.destinationReceiver,
                nonce: args.nonce.toString(),
                payload: args.payload,
                payloadHash: args.payloadHash
              };
              break;
            }
          } catch {
            // Not a matching log
          }
        }

        return {
          status: 'success',
          transaction: {
            hash: tx.hash,
            chainId,
            from: tx.from,
            to: tx.to,
            blockNumber: Number(tx.blockNumber),
            blockHash: tx.blockHash,
            transactionIndex: tx.transactionIndex,
            status: receipt.status,
            gasUsed: receipt.gasUsed.toString(),
            hasDispatchedMessage: dispatchedMessage !== null,
            dispatchedMessage
          }
        };
      } catch (err: any) {
        return reply.status(500).send({
          status: 'error',
          code: 'RPC_ERROR',
          message: err?.message || 'Failed to fetch transaction from RPC'
        });
      }
    }
  );

  /**
   * POST /api/transactions/generate
   * Generate a test transaction by dispatching a message from SourceBridge
   */
  server.post('/transactions/generate', async (request, reply) => {
    const bodySchema = z.object({
      sourceChainId: z.number().default(31337),
      destinationChainId: z.number().default(31338),
      payload: z.string().optional()
    });

    const parseResult = bodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        status: 'error',
        code: 'INVALID_INPUT',
        message: parseResult.error.errors[0]?.message || 'Invalid parameters'
      });
    }

    const { sourceChainId, destinationChainId, payload } = parseResult.data;

    try {
      const sourceConfig = chainService.getChainConfig(sourceChainId);
      const destConfig = chainService.getChainConfig(destinationChainId);

      if (!sourceConfig.sourceBridgeAddress) {
        return reply.status(400).send({
          status: 'error',
          code: 'NO_SOURCE_BRIDGE',
          message: `No SourceBridge configured for chain ${sourceChainId}`
        });
      }

      if (!destConfig.receiverAddress) {
        return reply.status(400).send({
          status: 'error',
          code: 'NO_RECEIVER',
          message: `No receiver configured for chain ${destinationChainId}`
        });
      }

      // Generate payload
      const payloadString = payload || `CrossProof Test ${Date.now()}`;
      const payloadHex = ('0x' + Buffer.from(payloadString, 'utf8').toString('hex')) as Hex;

      // Get wallet client for source chain
      const sourceWallet = chainService.getWalletClient(sourceChainId);
      const sourcePublic = chainService.getPublicClient(sourceChainId);

      // Dispatch message
      const txHash = await (sourceWallet as any).writeContract({
        address: sourceConfig.sourceBridgeAddress,
        abi: SourceBridgeAbi,
        functionName: 'dispatchMessage',
        args: [BigInt(destinationChainId), destConfig.receiverAddress, payloadHex]
      });

      // Wait for receipt
      const receipt = await sourcePublic.waitForTransactionReceipt({
        hash: txHash,
        timeout: 15_000
      });

      if (receipt.status !== 'success') {
        return reply.status(422).send({
          status: 'error',
          code: 'TRANSACTION_REVERTED',
          message: `Generated SourceBridge transaction reverted on chain ${sourceChainId}`,
          transactionHash: txHash
        });
      }

      // Extract message ID from logs
      let messageId: string | null = null;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: SourceBridgeAbi,
            data: log.data,
            topics: log.topics
          });
          if (decoded.eventName === 'MessageDispatched') {
            if (log.address.toLowerCase() !== sourceConfig.sourceBridgeAddress!.toLowerCase()) {
              continue;
            }
            messageId = (decoded.args as any).messageId;
            break;
          }
        } catch {
          // Not a matching log
        }
      }

      return {
        status: 'success',
        transaction: {
          hash: txHash,
          chainId: sourceChainId,
          blockNumber: Number(receipt.blockNumber),
          blockHash: receipt.blockHash,
          transactionIndex: receipt.transactionIndex,
          status: receipt.status,
          messageId,
          payload: payloadHex,
          destinationChainId
        }
      };
    } catch (err: any) {
      return reply.status(500).send({
        status: 'error',
        code: 'TRANSACTION_FAILED',
        message: err?.shortMessage || err?.message || 'Failed to generate test transaction'
      });
    }
  });
};
