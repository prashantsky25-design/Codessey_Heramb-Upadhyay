# CrossProof: Known Limitations & Production Roadmap

---

## 1. What is Fully Implemented & Verified

- [x] **Source Message Bridge (`SourceBridge.sol`):** Monotonic nonces, domain-separated `messageId` derivation, strongly-typed `MessageDispatched` event emission.
- [x] **Merkle Patricia Trie Verification (`MPTProof.sol` & `ReceiptVerifier.sol`):** Authentic EVM Patricia Trie traversal and leaf verification directly in Solidity.
- [x] **Ethereum Receipt RLP Parser (`RLPReader.sol`):** Memory-safe RLP decoding of legacy and EIP-2718 typed transaction receipts, status checks, and log extraction.
- [x] **Destination Verifier (`DestinationVerifier.sol`):** Origin configuration checks, destination chain ID validation, payload hash binding, and persistent replay protection (`processedMessages[messageId]`).
- [x] **Adversarial Security Suite (42 Foundry Tests):** Tested against tampered proof nodes, corrupted receipts, wrong tx indices, replay attacks, payload substitutions, unconfigured chains, and unauthorized administrative actions.
- [x] **Cryptographic Proof Builder Engine (`packages/proof`):** Automatic Patricia Trie reconstruction from block receipts using `@ethereumjs/trie` and Viem, with root comparison against canonical `block.receiptsRoot` and local proof validation (9 unit tests).
- [x] **Validated Backend API (`apps/api`):** Fastify server with Zod schema validation, structured error codes, health endpoints, and 10 live attack vectors (4 test suites).
- [x] **Professional Web UI (`apps/web`):** Clean institutional light-blue theme, deterministic 6-stage verification timeline, Proof Inspector, and 10-vector Attack Lab with strict outcome semantics (`BLOCKED`, `VULNERABILITY_DETECTED`, `ERROR`, `INCONCLUSIVE`).

---

## 2. Incomplete Components & Honest Limitations

### A. Consensus Light Client Scope (Mode A vs Mode B)
- **Current Status:** For the local dual-chain demo, `DevHeaderOracle.sol` (Mode A) is used. It relies on an authorized relayer to commit `(blockNumber, blockHash, receiptsRoot)`.
- **Limitation:** In Mode A, if the relayer is dishonest, it could commit an invalid header. However, transaction receipt inclusion within the committed header remains strictly verified cryptographically.
- **Mode B Implementation:** `LightClientHeaderVerifier.sol` is implemented and tested to parse RLP block headers, verify `blockHash == keccak256(headerRlp)`, extract `receiptsRoot`, check checkpoint slot boundaries, and verify designated committee threshold signatures. For the prototype demonstration, it uses an ECDSA trusted signer scheme to represent consensus authority signatures rather than a full 512-validator BLS sync committee (pending EIP-2537).

### B. Ethereum PoS Beacon Chain Sync Committee Gas Costs
- **Limitation:** Full verification of 512 BLS12-381 validator signatures on EVM without EIP-2537 precompiles incurs prohibitive gas costs.
- **Production Solution:** Once EIP-2537 (BLS precompiles) is activated or when using SNARK-wrapped consensus proofs (such as Succinct Telepathy or Axiom), the consensus verification can be verified trustlessly on L2s for under 250k gas.

### C. Layer 2 Rollup State Root Finality
- **Limitation:** When verifying transactions from Optimism, Base, or Arbitrum on Ethereum L1, the source L2 state root must first be finalized by the L2 output oracle / dispute game (e.g. 7-day challenge window or ZK validity proof).
- **Scope:** CrossProof currently targets L1-to-L1 or L1-to-L2 execution.

### D. Destination Receiver Failure Semantics & Reentrancy Isolation
- **Mechanism:** In `DestinationVerifier.sol`, the replay flag `processedMessages[messageId] = true` is committed BEFORE invoking external receiver contracts (CEI pattern), and calls to `IDestinationReceiver` are wrapped in a `try/catch` block.
- **Design Tradeoff:** If an application receiver reverts or exhausts its gas, the verification transaction succeeds, the message is permanently marked as processed, and `verificationRecords[messageId].executed` is set to `false`.
- **Security Rationale:** This prevents malicious or buggy receivers from causing relayer griefing, unhandled reverts, or reentrancy attacks against the verification core.
- **Limitation:** In this MVP, failed receiver callbacks are terminal (no automatic retry queue). Production implementations should provide a permissioned `retryExecution(bytes32 messageId, bytes calldata payload)` function.

---

## 3. Explicit Production Roadmap

| Milestone | Target | Description |
| :--- | :--- | :--- |
| **Phase 1 (Complete)** | Local & Testnet | Full MPT receipt inclusion verification, domain separation, replay protection, and 10-vector attack lab. |
| **Phase 2** | Testnet | Integration of EIP-2537 BLS precompiles for Ethereum PoS sync committee verification. |
| **Phase 3** | Mainnet | ZK-SNARK light client proofs for Ethereum and major EVM L2s. |
| **Phase 4** | Cross-Ecosystem | Non-EVM adapters for Cosmos IBC and Solana receipt inclusion proofs. |
