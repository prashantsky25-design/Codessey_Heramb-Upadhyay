import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Resolves binary from system PATH first, falling back to local workspace bin/
 */
export function resolveBinary(name) {
  // 1. Check system PATH
  try {
    const cmd = process.platform === 'win32' ? `where.exe ${name}` : `which ${name}`;
    const out = execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
    if (out) {
      const firstLine = out.split(/\r?\n/)[0].trim();
      if (fs.existsSync(firstLine)) {
        return firstLine;
      }
      return name;
    }
  } catch {
    // Not found in PATH, check workspace fallback
  }

  // 2. Check workspace bin/
  const ext = process.platform === 'win32' ? '.exe' : '';
  const localBinWithExt = path.resolve(rootDir, 'bin', `${name}${ext}`);
  if (fs.existsSync(localBinWithExt)) {
    return localBinWithExt;
  }

  const localBinNoExt = path.resolve(rootDir, 'bin', name);
  if (fs.existsSync(localBinNoExt)) {
    return localBinNoExt;
  }

  console.warn(
    `[Warning] Binary '${name}' not found in system PATH or local bin directory.\n` +
    `To install Foundry, run:\n` +
    `  curl -L https://foundry.paradigm.xyz | bash\n` +
    `  foundryup\n`
  );
  return name;
}

export function resolveAnvil() {
  return resolveBinary('anvil');
}

export function resolveForge() {
  return resolveBinary('forge');
}
