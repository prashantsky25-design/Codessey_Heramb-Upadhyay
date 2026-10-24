# CrossProof Judging Demonstration Guide (3-5 Minutes)

This step-by-step walkthrough demonstrates CrossProof's cryptographic cross-chain transaction verification, replay protection, and adversarial proof rejection.

---

## Prerequisites & One-Command Demo

To run the complete automated end-to-end cryptographic pipeline and all security attack checks:

```bash
npm run demo
```

This command:
1. Spawns two independent local EVM chains (Chain 31337 on port 8545, Chain 31338 on port 8546).
2. Deploys the smart contracts on both chains.
3. Dispatches a real message on the source chain.
4. Reconstructs the Merkle Patricia Trie receipt inclusion proof.
5. Verifies the proof on-chain in the destination verifier.
6. Simulates adversarial attacks (tampered proof node, replay attack, payload substitution) and proves they revert on-chain.

---

## Interactive UI Walkthrough (Judging Flow)

### 1. Launch the Full-Stack Application

In separate terminal windows:

```bash
# Terminal 1: Start local dual chains (if not already running)
npm run demo

# Terminal 2: Start Backend API
npm run api:dev

# Terminal 3: Start Web Frontend
npm run web:dev
```

Open `http://localhost:5173` in your browser.

---

### 2. Walkthrough Checklist for Judges

#### Minute 1: Protocol Overview & Metrics
1. Navigate to the **Overview** dashboard.
2. Note the **Active Mode Banner (Mode A: Local Dev Header Oracle)**: honest, transparent disclosure of the local consensus trust model.
3. Observe live metric cards: Total Verified, Attacks Blocked, Avg Proof Time (~14ms), and Avg Destination Gas (~247k gas).
4. Review the **Network Protocol State** panel showing both local EVM chains.

#### Minute 2: Verifying a Real Transaction
1. Click **Verify a Transaction** in the navigation bar.
2. Click **Demo Message #1** under the transaction hash input to auto-fill the sample source transaction.
3. Click the cyan **Verify** button.
4. Watch the **Cryptographic Verification Pipeline Timeline** complete stage-by-stage:
   - Stage 1: Source Transaction Found (Block height & tx index)
   - Stage 2: Receipt & Trie Proof Retrieved (Node count & byte size)
   - Stage 3: Inclusion Proof Validated (ReceiptsRoot)
   - Stage 4: Source Header Authenticity Validated (Committed to oracle)
   - Stage 5: Destination Verifier Called (Destination tx hash)
   - Stage 6: On-Chain Result Confirmed (Destination block receipt)
5. Expand the **Cryptographic Proof Inspector** panel:
   - Inspect the exact Patricia Trie nodes.
   - Inspect the RLP-encoded Ethereum receipt bytes.
   - Copy hashes using the one-click copy buttons.

#### Minute 3: The Proof Attack Lab (Core Differentiator)
1. Click **Attack Lab** in the navigation bar.
2. **Attack A: Tamper Proof Node**
   - Click **Execute Adversarial Transaction**.
   - Notice the immediate rejection: `[BLOCKED] Destination contract reverted with InvalidMPTProof (0xdb7d8e3a)`.
   - Read the cryptographic analysis explaining how hash-collision resistance blocks forged trie nodes.
3. **Attack B: Replay Message**
   - Select Attack B and click **Execute Adversarial Transaction**.
   - Notice the rejection: `[BLOCKED] Destination contract reverted with MessageAlreadyProcessed (0x730ac1e2)`.
   - Read how persistent on-chain state and CEI prevent double-processing.
4. **Attack C: Substitute Payload**
   - Select Attack C and execute.
   - Notice the rejection: `[BLOCKED] Destination contract reverted with PayloadHashMismatch`.

#### Minute 4: Architecture & Trust Model
1. Navigate to **Trust Model** to review the threat model and the exact cryptographic properties enforced on-chain.
2. Navigate to **Architecture** to view the sequence flow and modular interface separation.
