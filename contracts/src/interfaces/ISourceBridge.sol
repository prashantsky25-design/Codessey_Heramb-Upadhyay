// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ISourceBridge
 * @notice Interface for dispatching cross-chain messages from source chain
 */
interface ISourceBridge {
    struct CrossChainMessage {
        uint256 sourceChainId;
        address sourceContract;
        uint256 destinationChainId;
        address destinationReceiver;
        uint256 nonce;
        bytes payload;
    }

    event MessageDispatched(
        bytes32 indexed messageId,
        uint256 indexed sourceChainId,
        uint256 indexed destinationChainId,
        address sourceContract,
        address destinationReceiver,
        uint256 nonce,
        bytes payload,
        bytes32 payloadHash
    );

    function dispatchMessage(
        uint256 destinationChainId,
        address destinationReceiver,
        bytes calldata payload
    ) external returns (bytes32 messageId, uint256 nonce);

    function computeMessageId(
        uint256 sourceChainId,
        address sourceContract,
        uint256 destinationChainId,
        address destinationReceiver,
        uint256 nonce,
        bytes32 payloadHash
    ) external pure returns (bytes32);
}
