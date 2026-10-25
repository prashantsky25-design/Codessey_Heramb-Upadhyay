import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { resolveAnvil } from './resolveBinaries.js';

function checkRpc(port) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1
    });

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 1000
      },
      (res) => {
        resolve(res.statusCode === 200);
      }
    );

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.write(postData);
    req.end();
  });
}

async function waitForRpc(port, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await checkRpc(port);
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function main() {
  console.log('Checking local EVM chains (Ports 8545 & 8546)...');
  const sourceRunning = await checkRpc(8545);
  const destRunning = await checkRpc(8546);

  const anvilBin = resolveAnvil();
  let sourceProcess = null;
  let destProcess = null;

  if (!sourceRunning) {
    console.log(`Spawning Source Chain (${anvilBin} --port 8545 --chain-id 31337)...`);
    sourceProcess = spawn(anvilBin, ['--port', '8545', '--chain-id', '31337'], {
      stdio: 'pipe'
    });
    sourceProcess.stdout.on('data', (d) => {
      const s = d.toString();
      if (s.includes('Listening')) console.log('[Chain 31337 Ready]: ' + s.trim());
    });
    sourceProcess.stderr.on('data', (d) => console.error('[Chain 31337 Error]: ' + d.toString()));
    sourceProcess.on('error', (err) => console.error('Source chain error:', err));
  } else {
    console.log('Source Chain already running on port 8545.');
  }

  if (!destRunning) {
    console.log(`Spawning Destination Chain (${anvilBin} --port 8546 --chain-id 31338)...`);
    destProcess = spawn(anvilBin, ['--port', '8546', '--chain-id', '31338'], {
      stdio: 'pipe'
    });
    destProcess.stdout.on('data', (d) => {
      const s = d.toString();
      if (s.includes('Listening')) console.log('[Chain 31338 Ready]: ' + s.trim());
    });
    destProcess.stderr.on('data', (d) => console.error('[Chain 31338 Error]: ' + d.toString()));
    destProcess.on('error', (err) => console.error('Destination chain error:', err));
  } else {
    console.log('Destination Chain already running on port 8546.');
  }

  const sourceReady = await waitForRpc(8545);
  const destReady = await waitForRpc(8546);

  if (!sourceReady || !destReady) {
    console.error('Failed to connect to local chains. Aborting demo.');
    if (sourceProcess) sourceProcess.kill();
    if (destProcess) destProcess.kill();
    process.exit(1);
  }

  console.log('Both local chains online! Running End-to-End Cryptographic Demo...\n');

  // Run scripts/e2e-demo.ts using npx tsx
  const demoProc = spawn('npx', ['tsx', 'scripts/e2e-demo.ts'], {
    stdio: 'inherit',
    shell: true
  });

  demoProc.on('exit', (code) => {
    if (sourceProcess) sourceProcess.kill();
    if (destProcess) destProcess.kill();
    console.log(`Demo finished with exit code ${code}`);
    process.exit(code || 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
