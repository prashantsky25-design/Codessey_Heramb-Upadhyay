// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ISourceBridge} from "./interfaces/ISourceBridge.sol";

/**
 * @title SourceBridge
 * @notice Canonical cross-chain dispatch contract deployed on origin EVM chains
 */
contract SourceBridge is ISourceBridge {
    bytes32 public constant MESSAGE_TYPEHASH =
        keccak256("CrossChainMessage(uint256 sourceChainId,address sourceContract,uint256 destinationChainId,address destinationReceiver,uint256 nonce,bytes32 payloadHash)");

    uint256 public nonceCounter;

    error InvalidDestinationChainId();
    error InvalidDestinationReceiver();
    error EmptyPayload();

    function dispatchMessage(
        uint256 destinationChainId,
        address destinationReceiver,
        bytes calldata payload
    ) external override returns (bytes32 messageId, uint256 nonce) {
        if (destinationChainId == block.chainid || destinationChainId == 0) {
            revert InvalidDestinationChainId();
        }
        if (destinationReceiver == address(0)) {
            revert InvalidDestinationReceiver();
        }
        if (payload.length == 0) {
            revert EmptyPayload();
        }

        nonce = ++nonceCounter;
        bytes32 payloadHash = keccak256(payload);

        messageId = computeMessageId(
            block.chainid,
            address(this),
            destinationChainId,
            destinationReceiver,
            nonce,
            payloadHash
        );

        emit MessageDispatched(
            messageId,
            block.chainid,
            destinationChainId,
            address(this),
            destinationReceiver,
            nonce,
            payload,
            payloadHash
        );
    }

    function computeMessageId(
        uint256 sourceChainId,
        address sourceContract,
        uint256 destinationChainId,
        address destinationReceiver,
        uint256 nonce,
        bytes32 payloadHash
    ) public pure override returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    MESSAGE_TYPEHASH,
                    sourceChainId,
                    sourceContract,
                    destinationChainId,
                    destinationReceiver,
                    nonce,
                    payloadHash
                )
            );
    }
}
