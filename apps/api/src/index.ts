import { buildServer } from './server';
import { config } from './config';

async function main() {
  const server = buildServer();

  try {
    const address = await server.listen({
      port: config.port,
      host: config.host
    });
    server.log.info(`CrossProof API server running at ${address}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
