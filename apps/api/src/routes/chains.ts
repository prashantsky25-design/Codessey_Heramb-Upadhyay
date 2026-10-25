import { FastifyPluginAsync } from 'fastify';
import { config } from '../config.js';

export const chainRoutes: FastifyPluginAsync = async (server) => {
  server.get('/chains', async () => {
    return {
      status: 'success',
      chains: Object.values(config.chains)
    };
  });
};
