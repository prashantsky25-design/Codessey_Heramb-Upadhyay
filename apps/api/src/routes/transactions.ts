import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { chainService } from '../services/chainService';
import { decodeEventLog, Hash } from 'viem';
import { SourceBridgeAbi } from '@crossproof/shared';

const GetTxParamsSchema = z.object({
  chainId: z.string().transform((v) => Number(v)),
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'Invalid transaction hash format')
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
};
