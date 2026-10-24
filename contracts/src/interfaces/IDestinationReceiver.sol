// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDestinationReceiver
 * @notice Application contract interface on destination chain to receive verified cross-chain calls
 */
interface IDestinationReceiver {
    /**
     * @notice Handles an authenticated cross-chain message
     * @param messageId Unique cryptographic identifier of the message
     * @param sourceChainId Origin chain ID
     * @param sourceContract Origin contract address
     * @param payload Message payload
     * @return magicSelector Must return IDestinationReceiver.onCrossChainMessage.selector on success
     */
    function onCrossChainMessage(
        bytes32 messageId,
        uint256 sourceChainId,
        address sourceContract,
        bytes calldata payload
    ) external returns (bytes4 magicSelector);
}
