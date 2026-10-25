import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { healthRoutes } from './routes/health.js';
import { chainRoutes } from './routes/chains.js';
import { transactionRoutes } from './routes/transactions.js';
import { verificationRoutes } from './routes/verification.js';
import { attackRoutes } from './routes/attack.js';

export function buildServer(): FastifyInstance {
  const server = fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info'
    },
    bodyLimit: 5 * 1024 * 1024 // 5 MB
  });

  server.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });

  // Register API routes
  server.register(healthRoutes, { prefix: '/api' });
  server.register(chainRoutes, { prefix: '/api' });
  server.register(transactionRoutes, { prefix: '/api' });
  server.register(verificationRoutes, { prefix: '/api' });
  server.register(attackRoutes, { prefix: '/api' });

  // Custom Error Handler
  server.setErrorHandler((error, request, reply) => {
    server.log.error(error);
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      status: 'error',
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected server error occurred'
    });
  });

  return server;
}
