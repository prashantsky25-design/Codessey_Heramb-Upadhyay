import {
  createPublicClient,
  createWalletClient,
  http,
  Hex
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';
import path from 'path';

const DEPLOYER_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY);

function loadArtifact(name: string) {
  const artifactPath = path.resolve(
    process.cwd(),
    `contracts/out/${name}.sol/${name}.json`
  );
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact ${name} not found at ${artifactPath}. Run forge build first.`);
  }
  return JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
}

export async function deployContracts(
  sourceRpc = 'http://127.0.0.1:8545',
  destRpc = 'http://127.0.0.1:8546'
) {
  console.log('--- DEPLOYING CROSSPROOF PROTOCOL CONTRACTS ---');
  console.log('Deployer Address:', account.address);

  // 1. Setup clients
  const sourceClient = createPublicClient({ transport: http(sourceRpc) });
  const sourceWallet = createWalletClient({ account, transport: http(sourceRpc) });

  const destClient = createPublicClient({ transport: http(destRpc) });
  const destWallet = createWalletClient({ account, transport: http(destRpc) });

  // 2. Deploy SourceBridge on Chain 31337
  console.log('\n[1/5] Deploying SourceBridge on Chain 31337 (Source)...');
  const sourceBridgeArtifact = loadArtifact('SourceBridge');
  const sourceBridgeDeployHash = await sourceWallet.deployContract({
    abi: sourceBridgeArtifact.abi,
    bytecode: sourceBridgeArtifact.bytecode.object as Hex
  });
  const sourceBridgeReceipt = await sourceClient.waitForTransactionReceipt({
    hash: sourceBridgeDeployHash
  });
  const sourceBridgeAddress = sourceBridgeReceipt.contractAddress!;
  console.log('  SourceBridge deployed at:', sourceBridgeAddress);

  // 3. Deploy DevHeaderOracle on Chain 31338
  console.log('\n[2/5] Deploying DevHeaderOracle on Chain 31338 (Destination)...');
  const oracleArtifact = loadArtifact('DevHeaderOracle');
  const oracleDeployHash = await destWallet.deployContract({
    abi: oracleArtifact.abi,
    bytecode: oracleArtifact.bytecode.object as Hex,
    args: [account.address]
  });
  const oracleReceipt = await destClient.waitForTransactionReceipt({
    hash: oracleDeployHash
  });
  const oracleAddress = oracleReceipt.contractAddress!;
  console.log('  DevHeaderOracle deployed at:', oracleAddress);

  // 4. Deploy ReceiptVerifier on Chain 31338
  console.log('\n[3/5] Deploying ReceiptVerifier on Chain 31338 (Destination)...');
  const receiptVerifierArtifact = loadArtifact('ReceiptVerifier');
  const receiptDeployHash = await destWallet.deployContract({
    abi: receiptVerifierArtifact.abi,
    bytecode: receiptVerifierArtifact.bytecode.object as Hex
  });
  const receiptReceipt = await destClient.waitForTransactionReceipt({
    hash: receiptDeployHash
  });
  const receiptVerifierAddress = receiptReceipt.contractAddress!;
  console.log('  ReceiptVerifier deployed at:', receiptVerifierAddress);

  // 5. Deploy DestinationVerifier on Chain 31338
  console.log('\n[4/5] Deploying DestinationVerifier on Chain 31338 (Destination)...');
  const destVerifierArtifact = loadArtifact('DestinationVerifier');
  const destVerifierDeployHash = await destWallet.deployContract({
    abi: destVerifierArtifact.abi,
    bytecode: destVerifierArtifact.bytecode.object as Hex,
    args: [oracleAddress, receiptVerifierAddress]
  });
  const destVerifierReceipt = await destClient.waitForTransactionReceipt({
    hash: destVerifierDeployHash
  });
  const destVerifierAddress = destVerifierReceipt.contractAddress!;
  console.log('  DestinationVerifier deployed at:', destVerifierAddress);

  // 6. Deploy CrossProofReceiver on Chain 31338
  console.log('\n[5/5] Deploying CrossProofReceiver application on Chain 31338...');
  const appReceiverArtifact = loadArtifact('CrossProofReceiver');
  const appReceiverDeployHash = await destWallet.deployContract({
    abi: appReceiverArtifact.abi,
    bytecode: appReceiverArtifact.bytecode.object as Hex,
    args: [destVerifierAddress]
  });
  const appReceiverReceipt = await destClient.waitForTransactionReceipt({
    hash: appReceiverDeployHash
  });
  const appReceiverAddress = appReceiverReceipt.contractAddress!;
  console.log('  CrossProofReceiver deployed at:', appReceiverAddress);

  // 7. Configure trusted source bridge in DestinationVerifier
  console.log('\n[CONFIG] Authorizing SourceBridge in DestinationVerifier...');
  const configTx = await destWallet.writeContract({
    address: destVerifierAddress,
    abi: destVerifierArtifact.abi,
    functionName: 'setSourceBridge',
    args: [31337n, sourceBridgeAddress]
  });
  await destClient.waitForTransactionReceipt({ hash: configTx });
  console.log('  SourceBridge authorized for chain 31337!');

  const deploymentData = {
    sourceChainId: 31337,
    destinationChainId: 31338,
    sourceBridge: sourceBridgeAddress,
    headerOracle: oracleAddress,
    receiptVerifier: receiptVerifierAddress,
    destinationVerifier: destVerifierAddress,
    appReceiver: appReceiverAddress,
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    path.resolve(process.cwd(), 'deployed-addresses.json'),
    JSON.stringify(deploymentData, null, 2)
  );
  console.log('\nSaved deployment data to deployed-addresses.json');

  return deploymentData;
}

if (process.argv[1] && process.argv[1].includes('deploy-local')) {
  deployContracts().catch((err) => {
    console.error('Deployment failed:', err);
    process.exit(1);
  });
}
