import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveAnvil } from './resolveBinaries.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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

const anvilBin = resolveAnvil();

console.log('====================================================');
console.log('       STARTING CROSSPROOF FULL-STACK ECOSYSTEM     ');
console.log('====================================================\n');

// 1. Start Anvil Chain 31337 if not already active
const isSourceAlreadyRunning = await checkRpc(8545);
let sourceAnvil = null;
if (!isSourceAlreadyRunning) {
  console.log(`[1/4] Starting Origin Blockchain (${anvilBin} port 8545, chainId 31337)...`);
  sourceAnvil = spawn(anvilBin, ['--port', '8545', '--chain-id', '31337'], {
    stdio: 'pipe'
  });
  sourceAnvil.stdout.on('data', (d) => {
    if (d.toString().includes('Listening')) {
      console.log('  -> Source chain listening on http://127.0.0.1:8545');
    }
  });
} else {
  console.log('[1/4] Origin Blockchain already active on port 8545.');
}

// 2. Start Anvil Chain 31338 if not already active
const isDestAlreadyRunning = await checkRpc(8546);
let destAnvil = null;
if (!isDestAlreadyRunning) {
  console.log(`[2/4] Starting Destination Blockchain (${anvilBin} port 8546, chainId 31338)...`);
  destAnvil = spawn(anvilBin, ['--port', '8546', '--chain-id', '31338'], {
    stdio: 'pipe'
  });
  destAnvil.stdout.on('data', (d) => {
    if (d.toString().includes('Listening')) {
      console.log('  -> Destination chain listening on http://127.0.0.1:8546');
    }
  });
} else {
  console.log('[2/4] Destination Blockchain already active on port 8546.');
}

// Wait for both chains
const ok1 = await waitForRpc(8545);
const ok2 = await waitForRpc(8546);

if (!ok1 || !ok2) {
  console.error('Failed to start EVM nodes.');
  process.exit(1);
}

// 3. Deploy smart contracts
console.log('\n[3/4] Deploying Protocol Contracts to Both Chains...');
const { deployContracts } = await import('./deploy-local.ts');
const deployment = await deployContracts();

// 4. Start API server
console.log('\n[4/4] Starting Backend API Server (Port 3001) & Web Frontend (Port 5173)...');

const apiProc = spawn('npx', ['tsx', 'apps/api/src/index.ts'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

const webProc = spawn('npx', ['vite', '--port', '5173', '--host'], {
  cwd: path.resolve(rootDir, 'apps/web'),
  stdio: 'inherit',
  shell: true
});

console.log('\n====================================================');
console.log('   CROSSPROOF APPLICATION RUNNING AND READY!        ');
console.log('   Web UI:      http://localhost:5173               ');
console.log('   Backend API: http://localhost:3001/api/health    ');
console.log('   Chain 31337: http://localhost:8545               ');
console.log('   Chain 31338: http://localhost:8546               ');
console.log('====================================================\n');

function shutdown() {
  console.log('\nStopping all services...');
  if (sourceAnvil) sourceAnvil.kill();
  if (destAnvil) destAnvil.kill();
  apiProc.kill();
  webProc.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
