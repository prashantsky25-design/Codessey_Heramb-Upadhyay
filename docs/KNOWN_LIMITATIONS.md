# CrossProof: Known Limitations & Production Roadmap

---

## 1. What is Fully Implemented & Verified

- [x] **Source Message Bridge (`SourceBridge.sol`):** Monotonic nonces, domain-separated `messageId` derivation, strongly-typed `MessageDispatched` event emission.
- [x] **Merkle Patricia Trie Verification (`MPTProof.sol` & `ReceiptVerifier.sol`):** Authentic EVM Patricia Trie traversal and leaf verification directly in Solidity.
- [x] **Ethereum Receipt RLP Parser (`RLPReader.sol`):** Memory-safe RLP decoding of legacy and EIP-2718 typed transaction receipts, status checks, and log extraction.
- [x] **Destination Verifier (`DestinationVerifier.sol`):** Origin configuration checks, destination chain ID validation, payload hash binding, and persistent replay protection (`processedMessages[messageId]`).
- [x] **Adversarial Security Suite (39 Foundry Tests):** Tested against tampered proof nodes, corrupted receipts, wrong tx indices, replay attacks, payload substitutions, unconfigured chains, and unauthorized administrative actions.
- [x] **Proof Builder Engine (`packages/proof`):** Automatic Patricia Trie reconstruction from block receipts using `@ethereumjs/trie` and Viem.
- [x] **Validated Backend API (`apps/api`):** Fastify server with Zod schema validation, structured error codes, and health endpoints.
- [x] **Professional Web UI (`apps/web`):** Charcoal/cyan design, deterministic 6-stage verification timeline, Proof Inspector, and interactive Proof Attack Lab.

---

## 2. Incomplete Components & Honest Limitations

### A. Consensus Light Client Scope (Mode A vs Mode B)
- **Current Status:** For the local dual-chain demo, `DevHeaderOracle.sol` (Mode A) is used. It relies on an authorized relayer to commit `(blockNumber, blockHash, receiptsRoot)`.
- **Limitation:** In Mode A, if the relayer is dishonest, it could commit an invalid header. However, transaction receipt inclusion within the committed header remains strictly verified cryptographically.
- **Mode B Implementation:** `LightClientHeaderVerifier.sol` is implemented and tested to parse RLP block headers, verify `blockHash == keccak256(headerRlp)`, extract `receiptsRoot`, and verify consensus committee threshold signatures.

### B. Ethereum PoS Beacon Chain Sync Committee Gas Costs
- **Limitation:** Full verification of 512 BLS12-381 validator signatures on EVM without EIP-2537 precompiles incurs prohibitive gas costs.
- **Production Solution:** Once EIP-2537 (BLS precompiles) is activated or when using SNARK-wrapped consensus proofs (such as Succinct Telepathy or Axiom), the consensus verification can be verified trustlessly on L2s for under 250k gas.

### C. Layer 2 Rollup State Root Finality
- **Limitation:** When verifying transactions from Optimism, Base, or Arbitrum on Ethereum L1, the source L2 state root must first be finalized by the L2 output oracle / dispute game (e.g. 7-day challenge window or ZK validity proof).
- **Scope:** CrossProof currently targets L1-to-L1 or L1-to-L2 execution.

---

## 3. Explicit Production Roadmap

| Milestone | Target | Description |
| :--- | :--- | :--- |
| **Phase 1 (Complete)** | Local & Testnet | Full MPT receipt inclusion verification, domain separation, replay protection, and attack lab. |
| **Phase 2** | Testnet | Integration of EIP-2537 BLS precompiles for Ethereum PoS sync committee verification. |
| **Phase 3** | Mainnet | ZK-SNARK light client proofs for Ethereum and major EVM L2s. |
| **Phase 4** | Cross-Ecosystem | Non-EVM adapters for Cosmos IBC and Solana receipt inclusion proofs. |
