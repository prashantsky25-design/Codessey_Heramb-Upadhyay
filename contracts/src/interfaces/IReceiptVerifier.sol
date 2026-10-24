// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IReceiptVerifier
 * @notice Interface for verifying transaction receipt inclusion via Merkle Patricia Trie proofs
 */
interface IReceiptVerifier {
    struct VerifiedCrossChainEvent {
        bytes32 messageId;
        uint256 sourceChainId;
        uint256 destinationChainId;
        address sourceContract;
        address destinationReceiver;
        uint256 nonce;
        bytes payload;
        bytes32 payloadHash;
    }

    /**
     * @notice Verifies receipt inclusion in the block's receiptsRoot and extracts the authentic CrossChainMessage event
     * @param expectedReceiptsRoot The Patricia Merkle Trie root from the verified block header
     * @param txIndex Index of the transaction in the block
     * @param receiptRlp RLP-encoded transaction receipt (with optional EIP-2718 type prefix)
     * @param mptProof Array of RLP-encoded trie nodes proving inclusion
     * @param expectedSourceContract Expected contract address that emitted the MessageDispatched event
     * @return verifiedEvent The authenticated message event extracted directly from the verified receipt logs
     */
    function verifyReceiptInclusionAndExtractMessage(
        bytes32 expectedReceiptsRoot,
        uint256 txIndex,
        bytes calldata receiptRlp,
        bytes[] calldata mptProof,
        address expectedSourceContract
    ) external pure returns (VerifiedCrossChainEvent memory verifiedEvent);
}
