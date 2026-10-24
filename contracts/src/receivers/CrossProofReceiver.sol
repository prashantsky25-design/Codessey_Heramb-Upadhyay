// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IDestinationReceiver} from "../interfaces/IDestinationReceiver.sol";

/**
 * @title CrossProofReceiver
 * @notice Example destination application receiving verified cross-chain actions
 */
contract CrossProofReceiver is IDestinationReceiver {
    address public immutable expectedVerifier;
    uint256 public totalMessagesReceived;
    bytes32 public lastProcessedMessageId;
    string public lastMessageContent;

    event ApplicationActionExecuted(
        bytes32 indexed messageId,
        uint256 indexed sourceChainId,
        address indexed sourceContract,
        string messageContent
    );

    error OnlyVerifier();
    error ZeroAddress();

    constructor(address _expectedVerifier) {
        if (_expectedVerifier == address(0)) revert ZeroAddress();
        expectedVerifier = _expectedVerifier;
    }

    function onCrossChainMessage(
        bytes32 messageId,
        uint256 sourceChainId,
        address sourceContract,
        bytes calldata payload
    ) external override returns (bytes4) {
        if (msg.sender != expectedVerifier) {
            revert OnlyVerifier();
        }

        totalMessagesReceived++;
        lastProcessedMessageId = messageId;
        lastMessageContent = string(payload);

        emit ApplicationActionExecuted(messageId, sourceChainId, sourceContract, lastMessageContent);

        return IDestinationReceiver.onCrossChainMessage.selector;
    }
}
