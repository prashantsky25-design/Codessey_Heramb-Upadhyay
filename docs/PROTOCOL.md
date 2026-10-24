# CrossProof Protocol Specification

---

## 1. Cross-Chain Message Structure

A cross-chain message in CrossProof is defined by the tuple:

$$\mathcal{M} = (C_{\text{src}}, A_{\text{src}}, C_{\text{dst}}, A_{\text{dst}}, N, P)$$

Where:
- $C_{\text{src}} \in \mathbb{N}$: Source EVM chain ID (`block.chainid`).
- $A_{\text{src}} \in \mathbb{B}_{20}$: Emitting contract address (`address(this)` on source chain).
- $C_{\text{dst}} \in \mathbb{N}$: Target destination EVM chain ID ($C_{\text{dst}} \neq C_{\text{src}}$).
- $A_{\text{dst}} \in \mathbb{B}_{20}$: Intended receiver address on the destination chain.
- $N \in \mathbb{N}$: Strictly increasing nonce counter per source bridge.
- $P \in \mathbb{B}^*$: Arbitrary application payload bytes.

---

## 2. Cryptographic Message ID Derivation

To guarantee domain separation and collision resistance across disparate chains, the unique `messageId` is computed as:

$$\text{MESSAGE\_TYPEHASH} = \text{keccak256}(\text{"CrossChainMessage(uint256 sourceChainId,address sourceContract,uint256 destinationChainId,address destinationReceiver,uint256 nonce,bytes32 payloadHash)"})$$

$$\text{payloadHash} = \text{keccak256}(P)$$

$$\text{messageId} = \text{keccak256}(\text{abi.encode}(\text{MESSAGE\_TYPEHASH}, C_{\text{src}}, A_{\text{src}}, C_{\text{dst}}, A_{\text{dst}}, N, \text{payloadHash}))$$

---

## 3. Transaction Receipt Inclusion Proof

In Ethereum and standard EVM networks, receipts are stored in a modified Merkle Patricia Trie (MPT):

1. **Key:** The RLP encoding of the transaction index within the block:
   - For $\text{txIndex} = 0$: $k = 0x80$
   - For $1 \leq \text{txIndex} \leq 127$: $k = \text{bytes1}(\text{txIndex})$
   - For $\text{txIndex} \geq 128$: standard RLP integer encoding.

2. **Value:** The RLP-encoded receipt:
   - **Legacy (Type 0):** $\text{RLP}([status, cumulativeGasUsed, logsBloom, logs])$
   - **Typed (Type 2 - EIP-1559):** $0x02 \,||\, \text{RLP}([status, cumulativeGasUsed, logsBloom, logs])$

3. **Proof Nodes:** A sequence of RLP-encoded trie nodes $\mathcal{N} = [N_0, N_1, \dots, N_m]$:
   - $N_0$ must satisfy: $\text{keccak256}(N_0) == \text{receiptsRoot}$
   - Each intermediate branch or extension node contains a pointer hash equal to $\text{keccak256}(N_{i+1})$.
   - The final leaf node $N_m$ resolves to the target receipt value.

---

## 4. Destination Verifier Interface

```solidity
struct CrossChainProof {
    uint256 sourceChainId;
    address sourceContract;
    uint256 blockNumber;
    bytes32 blockHash;
    bytes32 receiptsRoot;
    uint256 txIndex;
    bytes receiptRlp;
    bytes[] mptProof;
    bytes payload;
}

function verifyAndExecute(
    CrossChainProof calldata proof,
    bytes calldata headerProof
) external returns (bytes32 messageId);
```

### Destination Verification Rules:
1. `proof.sourceChainId` must be registered in `trustedSourceBridges`.
2. `proof.sourceContract` must match `trustedSourceBridges[proof.sourceChainId]`.
3. `IHeaderVerifier.verifySourceHeader` must return `true`.
4. `IReceiptVerifier.verifyReceiptInclusionAndExtractMessage` must succeed.
5. `processedMessages[messageId]` must be `false`.
6. `verifiedEvent.destinationChainId` must equal destination `block.chainid`.
7. `keccak256(proof.payload)` must equal `verifiedEvent.payloadHash`.
8. `processedMessages[messageId]` is set to `true` (CEI pattern).
9. If receiver has code, `IDestinationReceiver.onCrossChainMessage` is called.
