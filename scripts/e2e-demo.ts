import {
  createPublicClient,
  createWalletClient,
  http,
  Hex,
  formatEther
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { deployContracts } from './deploy-local';
import {
  buildReceiptInclusionProof,
  verifyReceiptInclusionProofLocally
} from '../packages/proof/src/proofBuilder';
import {
  SourceBridgeAbi,
  DestinationVerifierAbi,
  DevHeaderOracleAbi,
  CrossProofReceiverAbi
} from '../packages/shared/src/abis';

const DEPLOYER_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const account = privateKeyToAccount(DEPLOYER_KEY);

const SOURCE_RPC = process.env.SOURCE_CHAIN_RPC || 'http://127.0.0.1:8545';
const DEST_RPC = process.env.DEST_CHAIN_RPC || 'http://127.0.0.1:8546';

export async function runEndToEndDemo() {
  console.log('===============================================================');
  console.log('       CROSSPROOF PROTOCOL: END-TO-END VERIFICATION DEMO       ');
  console.log('          "Verify Across Chains. Trust the Proof."            ');
  console.log('===============================================================\n');

  // Step 1: Deploy / Initialize contracts
  console.log('[STAGE 1] Deploying / Confirming Protocol Contracts on Chains 31337 & 31338...');
  const deployment = await deployContracts(SOURCE_RPC, DEST_RPC);

  const sourceClient = createPublicClient({ transport: http(SOURCE_RPC) });
  const sourceWallet = createWalletClient({ account, transport: http(SOURCE_RPC) });

  const destClient = createPublicClient({ transport: http(DEST_RPC) });
  const destWallet = createWalletClient({ account, transport: http(DEST_RPC) });

  // Step 2: Dispatch message on Source Chain
  console.log('\n[STAGE 2] Dispatching Cross-Chain Message on Origin Blockchain (Chain 31337)...');
  const payloadString = 'CrossProof: Certified Decentralized Transaction';
  const payloadHex = ('0x' + Buffer.from(payloadString, 'utf8').toString('hex')) as Hex;

  const dispatchTxHash = await sourceWallet.writeContract({
    address: deployment.sourceBridge,
    abi: SourceBridgeAbi,
    functionName: 'dispatchMessage',
    args: [31338n, deployment.appReceiver, payloadHex]
  });

  console.log('  Source Transaction Submitted:', dispatchTxHash);
  const sourceReceipt = await sourceClient.waitForTransactionReceipt({ hash: dispatchTxHash });
  console.log(`  Source Transaction Confirmed in Block #${sourceReceipt.blockNumber} (TxIndex: ${sourceReceipt.transactionIndex})`);

  // Step 3: Off-chain cryptographic proof generation
  console.log('\n[STAGE 3] Constructing Merkle Patricia Trie Receipt Inclusion Proof...');
  const proofResult = await buildReceiptInclusionProof(sourceClient, dispatchTxHash);

  console.log('  Authentic MPT Proof Constructed!');
  console.log('  - Message ID:', proofResult.extractedEvent.messageId);
  console.log('  - ReceiptsRoot:', proofResult.proof.receiptsRoot);
  console.log(`  - Proof Nodes: ${proofResult.metrics.proofNodesCount} node(s)`);
  console.log(`  - Proof Size: ${proofResult.metrics.totalProofSizeBytes} bytes`);
  console.log(`  - Construction Duration: ${proofResult.metrics.durationMs}ms`);

  // Step 4: Pre-flight local proof verification
  console.log('\n[STAGE 4] Executing Off-Chain Independent MPT Verification...');
  const localValid = await verifyReceiptInclusionProofLocally(
    proofResult.proof.receiptsRoot as Hex,
    proofResult.proof.txIndex,
    proofResult.proof.receiptRlp as Hex,
    proofResult.proof.mptProof as Hex[]
  );
  if (!localValid) {
    throw new Error('Local proof check failed: trie traversal did not match receiptsRoot!');
  }
  console.log('  Local Cryptographic Proof Check Passed!');

  // Step 5: Commit header to DevHeaderOracle (Mode A local demonstration)
  console.log('\n[STAGE 5] Committing Source Block Header & ReceiptsRoot to Destination Verifier Oracle...');
  const commitTx = await destWallet.writeContract({
    address: deployment.headerOracle,
    abi: DevHeaderOracleAbi,
    functionName: 'commitSourceHeader',
    args: [
      31337n,
      BigInt(proofResult.proof.blockNumber),
      proofResult.proof.blockHash as Hex,
      proofResult.proof.receiptsRoot as Hex
    ]
  });
  await destClient.waitForTransactionReceipt({ hash: commitTx });
  console.log(`  Header Committed on Destination Chain for Block #${proofResult.proof.blockNumber}`);

  // Step 6: Submit proof to DestinationVerifier
  console.log('\n[STAGE 6] Submitting Cryptographic Proof to DestinationVerifier on Chain 31338...');
  const formattedProof = {
    sourceChainId: 31337n,
    sourceContract: deployment.sourceBridge,
    blockNumber: BigInt(proofResult.proof.blockNumber),
    blockHash: proofResult.proof.blockHash as Hex,
    receiptsRoot: proofResult.proof.receiptsRoot as Hex,
    txIndex: BigInt(proofResult.proof.txIndex),
    receiptRlp: proofResult.proof.receiptRlp as Hex,
    mptProof: proofResult.proof.mptProof as Hex[],
    payload: payloadHex
  };

  const destTxHash = await destWallet.writeContract({
    address: deployment.destinationVerifier,
    abi: DestinationVerifierAbi,
    functionName: 'verifyAndExecute',
    args: [formattedProof, '0x']
  });

  console.log('  Destination Verification Submitted:', destTxHash);
  const destReceipt = await destClient.waitForTransactionReceipt({ hash: destTxHash });

  if (destReceipt.status !== 'success') {
    throw new Error('Destination verification transaction reverted on-chain!');
  }
  console.log(`  Destination Transaction Confirmed in Block #${destReceipt.blockNumber}!`);
  console.log(`  Gas Used: ${destReceipt.gasUsed.toString()} gas`);

  // Step 7: Confirm application receiver state
  const totalReceived = (await destClient.readContract({
    address: deployment.appReceiver,
    abi: CrossProofReceiverAbi,
    functionName: 'totalMessagesReceived'
  })) as bigint;

  const lastProcessedId = (await destClient.readContract({
    address: deployment.appReceiver,
    abi: CrossProofReceiverAbi,
    functionName: 'lastProcessedMessageId'
  })) as Hex;

  console.log('\n[STAGE 7] Verifying Application-Level State on Destination Dapp...');
  console.log('  Total Messages Received on Destination Contract:', totalReceived.toString());
  console.log('  Last Processed Message ID:', lastProcessedId);

  if (totalReceived !== 1n || lastProcessedId.toLowerCase() !== proofResult.extractedEvent.messageId.toLowerCase()) {
    throw new Error('State verification failed: Application contract did not record verified message');
  }
  console.log('  Application state confirmed valid!');

  // ===============================================================
  // ATTACK LAB DEMONSTRATIONS (SECURITY VERIFICATION)
  // ===============================================================

  console.log('\n---------------------------------------------------------------');
  console.log('       SECURITY ATTACK LAB: ADVERSARIAL VALIDATION CHECKS      ');
  console.log('---------------------------------------------------------------');

  // ATTACK 1: Tampered Proof Node
  console.log('\n[ATTACK 1] Simulating Tampered MPT Proof Node Submission...');
  const tamperedProof = {
    ...formattedProof,
    mptProof: ['0xdeadbeef1234567890abcdef' as Hex] // Corrupted trie node
  };

  let attack1Blocked = false;
  try {
    await destWallet.writeContract({
      address: deployment.destinationVerifier,
      abi: DestinationVerifierAbi,
      functionName: 'verifyAndExecute',
      args: [tamperedProof, '0x']
    });
  } catch (err: any) {
    attack1Blocked = true;
    console.log('  [BLOCKED] Destination contract reverted tampered proof as expected!');
    console.log('  Rejection reason:', err?.shortMessage || 'Cryptographic MPT check failed closed');
  }

  if (!attack1Blocked) {
    throw new Error('SECURITY VULNERABILITY: Destination contract accepted a tampered proof node!');
  }

  // ATTACK 2: Replay Attack
  console.log('\n[ATTACK 2] Simulating Replay Attack (Resubmitting already verified message)...');
  let attack2Blocked = false;
  try {
    await destWallet.writeContract({
      address: deployment.destinationVerifier,
      abi: DestinationVerifierAbi,
      functionName: 'verifyAndExecute',
      args: [formattedProof, '0x']
    });
  } catch (err: any) {
    attack2Blocked = true;
    console.log('  [BLOCKED] Destination contract rejected replay attack as expected!');
    console.log('  Rejection reason:', err?.shortMessage || 'MessageAlreadyProcessed');
  }

  if (!attack2Blocked) {
    throw new Error('SECURITY VULNERABILITY: Destination contract allowed replaying a message twice!');
  }

  // ATTACK 3: Payload Substitution Attack
  console.log('\n[ATTACK 3] Simulating Payload Substitution Attack...');
  const substitutedProof = {
    ...formattedProof,
    payload: '0xdeadbeefbadf00d' as Hex // Substituted payload
  };

  let attack3Blocked = false;
  try {
    await destWallet.writeContract({
      address: deployment.destinationVerifier,
      abi: DestinationVerifierAbi,
      functionName: 'verifyAndExecute',
      args: [substitutedProof, '0x']
    });
  } catch (err: any) {
    attack3Blocked = true;
    console.log('  [BLOCKED] Destination contract rejected payload substitution as expected!');
    console.log('  Rejection reason:', err?.shortMessage || 'PayloadHashMismatch');
  }

  if (!attack3Blocked) {
    throw new Error('SECURITY VULNERABILITY: Destination contract allowed substituting the payload!');
  }

  console.log('\n===============================================================');
  console.log('     END-TO-END DEMO COMPLETED SUCCESSFULLY WITH 100% PASS     ');
  console.log('  All Cryptographic Checks, Replay Protections, & Attacks Passed! ');
  console.log('===============================================================\n');

  return {
    sourceTxHash: dispatchTxHash,
    destinationTxHash: destTxHash,
    messageId: proofResult.extractedEvent.messageId,
    gasUsed: destReceipt.gasUsed.toString(),
    proofSizeBytes: proofResult.metrics.totalProofSizeBytes,
    proofTimeMs: proofResult.metrics.durationMs
  };
}

if (process.argv[1] && process.argv[1].includes('e2e-demo')) {
  runEndToEndDemo().catch((err) => {
    console.error('Demo encountered an error:', err);
    process.exit(1);
  });
}
