import { FastifyPluginAsync } from 'fastify';
import { chainService } from '../services/chainService.js';
import { config } from '../config.js';

export const healthRoutes: FastifyPluginAsync = async (server) => {
  server.get('/health', async () => {
    const rpcStatuses: Record<number, { reachable: boolean; blockNumber?: number; error?: string }> = {};

    for (const chainId of [31337, 31338]) {
      try {
        const client = chainService.getPublicClient(chainId);
        const blockNum = await client.getBlockNumber();
        rpcStatuses[chainId] = {
          reachable: true,
          blockNumber: Number(blockNum)
        };
      } catch (err: any) {
        rpcStatuses[chainId] = {
          reachable: false,
          error: err?.message || 'RPC unreachable'
        };
      }
    }

    return {
      status: 'ok',
      service: 'crossproof-api',
      version: '1.0.0',
      timestamp: Date.now(),
      relayerAddress: chainService.getRelayerAddress(),
      chains: rpcStatuses,
      supportedChains: Object.keys(config.chains).map(Number)
    };
  });
};
