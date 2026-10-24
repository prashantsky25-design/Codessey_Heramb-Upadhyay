// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IHeaderVerifier
 * @notice Interface for verifying source-chain block header authenticity and finality
 */
interface IHeaderVerifier {
    event HeaderVerified(
        uint256 indexed sourceChainId,
        uint256 indexed blockNumber,
        bytes32 indexed blockHash,
        bytes32 receiptsRoot
    );

    /**
     * @notice Verifies whether a source block header is authentic, finalized, and matches the expected receiptsRoot
     * @param sourceChainId Chain ID of the source network
     * @param blockNumber Height of the source block
     * @param blockHash Canonical hash of the source block
     * @param receiptsRoot Patricia Merkle Trie root of receipts in the block
     * @param headerProof Cryptographic consensus/light client proof or oracle attestation
     * @return valid True if header is valid and finalized
     */
    function verifySourceHeader(
        uint256 sourceChainId,
        uint256 blockNumber,
        bytes32 blockHash,
        bytes32 receiptsRoot,
        bytes calldata headerProof
    ) external view returns (bool valid);

    /**
     * @notice Returns the trust model descriptor (e.g. "DEV_HEADER_ORACLE" or "LIGHT_CLIENT_CONSENSUS")
     */
    function getTrustModel() external pure returns (string memory);
}
