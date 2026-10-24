# CrossProof Security Model & Threat Analysis

> **Never accept a backend assertion that a transaction is valid when the required cryptographic and consensus evidence has not actually been verified.**

---

## 1. Threat Model & Attacker Capabilities

CrossProof is designed under an adversarial model where any intermediary—including relayers, RPC providers, network nodes, and callers—may be actively malicious.

### Attacker Profiles & Attack Vectors Considered

| Threat Vector | Attacker Action | CrossProof Defense Mechanism |
| :--- | :--- | :--- |
| **Proof Node Forgery** | Submitting forged Patricia Trie proof bytes to fake a transaction | `MPTProof.verifyMPTProof` computes `keccak256` down the trie nodes against `receiptsRoot`. Reverts with `InvalidMPTProof`. |
| **Receipt Tampering** | Changing status from 0 to 1, or modifying gas used / bloom filter | Mutated receipt bytes fail the cryptographic leaf hash equality test. |
| **Payload Substitution** | Keeping valid proof nodes of message $A$ but supplying malicious payload $B$ | `DestinationVerifier` checks `keccak256(proof.payload) == verifiedEvent.payloadHash`. Reverts with `PayloadHashMismatch`. |
| **Replay Attack** | Resubmitting a previously verified proof to duplicate execution | `DestinationVerifier` maintains persistent `processedMessages[messageId]` with Checks-Effects-Interactions (CEI). Reverts with `MessageAlreadyProcessed`. |
| **Cross-Chain Replay** | Reusing a proof targeting Chain 999 on Chain 31338 | Domain-separated `messageId` and event logs encode `destinationChainId`. Reverts with `InvalidDestinationChainId`. |
| **Counterfeit Bridge Emitter** | A rogue contract emits a fake `MessageDispatched` event | `ReceiptVerifier` checks `log.emitter == trustedSourceBridge`. Reverts with `EventNotFoundInReceipt`. |
| **Header Forgery** | Attacker posts an arbitrary `receiptsRoot` for an unfinalized or fabricated block | Enforced via `IHeaderVerifier`: In Mode A, restricted to authorized relayer; in Mode B, requires cryptographic consensus signatures over `(blockHash, blockNumber, chainId)`. |
| **Signature Malleability** | Using malleable ECDSA $s$ or $v$ values to bypass signature checks | `LightClientHeaderVerifier` rejects $s > \text{secp256k1n}/2$ and enforces $v \in \{27, 28\}$ (EIP-2 compliant). |

---

## 2. Trust Assumptions & Operational Modes

CrossProof distinguishes between two operational modes:

### Mode A: Local Development Demo (`DevHeaderOracle`)
- **Trust Assumption:** Source block headers and their `receiptsRoot` commitments are posted to the destination chain by an authorized relayer address.
- **Scope:** Restricted to local multi-chain demonstration and testing environments where syncing a 500GB PoS Beacon Chain is impractical.
- **Honest Disclosure:** Mode A is **not trustless**. If the relayer is compromised, it could commit an invalid header. However, transaction inclusion within that header is still strictly verified cryptographically.

### Mode B: Trust-Minimized Consensus (`LightClientHeaderVerifier`)
- **Trust Assumption:** Consensus committee validator keys or trusted checkpoint root.
- **Cryptographic Guarantees:** 
  1. The RLP block header is parsed on-chain.
  2. `blockHash == keccak256(headerRlp)` is verified.
  3. `receiptsRoot` is extracted directly from execution header field 5.
  4. Consensus committee threshold attestations are verified cryptographically.

---

## 3. Replay Protection Architecture

CrossProof maintains replay protection directly in smart contract state:

```solidity
// In DestinationVerifier.sol:
mapping(bytes32 => bool) public processedMessages;

function verifyAndExecute(CrossChainProof calldata proof, bytes calldata headerProof) external {
    // ... verification of header and receipt ...
    
    // Checks
    if (processedMessages[messageId]) {
        revert MessageAlreadyProcessed(messageId);
    }
    
    // Effects (CEI pattern - state set before external call)
    processedMessages[messageId] = true;
    
    // Interactions
    if (verifiedEv.destinationReceiver.code.length > 0) {
        IDestinationReceiver(verifiedEv.destinationReceiver).onCrossChainMessage(...);
    }
}
```

- Replay protection does **not** rely on frontend state or off-chain databases.
- The `messageId` uniquely binds `(sourceChainId, sourceContract, destinationChainId, destinationReceiver, nonce, payloadHash)`.

---

## 4. Privileged Roles & Administrative Functions

To adhere to least-privilege principles:
- **`DevHeaderOracle`:** Only `owner` can authorize or revoke relayers. Only authorized relayers can commit block headers.
- **`DestinationVerifier`:** Only `owner` can configure verifiers or authorize source bridges.
- **Verification execution:** `verifyAndExecute` is permissionless. Anyone (relayer, user, bot) can submit a valid proof. The security rests entirely on the cryptographic evidence.

---

## 5. Security Audit Verification Checklist

The CrossProof test suite in Foundry systematically tests all 22 required security scenarios:

- [x] Valid source transaction and valid proof (`test_EndToEndValidVerificationAndExecution`)
- [x] Modified proof node (`test_RevertIf_TamperedProofNode`)
- [x] Modified receipt data (`test_RevertIf_TamperedReceiptRlp`)
- [x] Incorrect transaction index (`test_RevertIf_WrongTxIndex`)
- [x] Incorrect source chain (`test_RevertIf_UnconfiguredSourceChain`)
- [x] Incorrect destination chain (`test_RevertIf_WrongDestinationChain`)
- [x] Incorrect source contract (`test_RevertIf_UntrustedSourceBridge`)
- [x] Replay of a successfully processed message (`test_RevertIf_ReplayMessage`)
- [x] Payload substitution attack (`test_RevertIf_PayloadSubstitution`)
- [x] Unauthorized administrative action (`test_RevertIf_UnauthorizedAdmin`)
- [x] Mismatched consensus block hash (`test_RevertIf_MismatchedBlockHash`)
- [x] Forged consensus signature (`test_RevertIf_ForgedSignature`)
- [x] Reverted receipt status on source chain (`test_RevertIf_FailedReceiptStatus`)

---

## 6. Production Hardening Roadmap

For mainnet production deployment:
1. **BLS12-381 Precompile Integration:** Implement full Ethereum Beacon Chain sync committee verification (EIP-2537) to aggregate 512 validator BLS signatures on-chain.
2. **ZK-Header Proofs:** Integrate zero-knowledge light-client proofs (e.g. Succinct / Telepathy) to reduce consensus verification gas costs to constant-time Groth16/Plonk verifiers.
3. **Decentralized Multi-Prover Relayer Network:** Add economic bonding and slashing for relayers that submit invalid proofs.
