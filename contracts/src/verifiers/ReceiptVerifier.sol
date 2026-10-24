// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IReceiptVerifier} from "../interfaces/IReceiptVerifier.sol";
import {MPTProof} from "../libraries/MPTProof.sol";
import {RLPReader} from "../libraries/RLPReader.sol";

/**
 * @title ReceiptVerifier
 * @notice Validates MPT receipt inclusion and extracts authenticated cross-chain messages
 */
contract ReceiptVerifier is IReceiptVerifier {
    using RLPReader for bytes;
    using RLPReader for RLPReader.RLPItem;

    // keccak256("MessageDispatched(bytes32,uint256,uint256,address,address,uint256,bytes,bytes32)")
    bytes32 public constant MESSAGE_DISPATCHED_TOPIC =
        keccak256("MessageDispatched(bytes32,uint256,uint256,address,address,uint256,bytes,bytes32)");

    // keccak256("CrossChainMessage(uint256 sourceChainId,address sourceContract,uint256 destinationChainId,address destinationReceiver,uint256 nonce,bytes32 payloadHash)")
    bytes32 public constant MESSAGE_TYPEHASH =
        keccak256("CrossChainMessage(uint256 sourceChainId,address sourceContract,uint256 destinationChainId,address destinationReceiver,uint256 nonce,bytes32 payloadHash)");

    error ReceiptInclusionFailed();
    error ReceiptStatusFailed();
    error EventNotFoundInReceipt();
    error SourceContractMismatch(address expected, address actual);
    error PayloadHashMismatch(bytes32 expected, bytes32 actual);
    error MessageIdMismatch(bytes32 expected, bytes32 actual);
    error InvalidReceiptEncoding();

    function verifyReceiptInclusionAndExtractMessage(
        bytes32 expectedReceiptsRoot,
        uint256 txIndex,
        bytes calldata receiptRlp,
        bytes[] calldata mptProof,
        address expectedSourceContract
    ) external pure override returns (VerifiedCrossChainEvent memory verifiedEvent) {
        // 1. Verify Patricia Trie inclusion proof
        bool included = MPTProof.verifyMPTProof(
            expectedReceiptsRoot,
            txIndex,
            mptProof,
            receiptRlp
        );
        if (!included) revert ReceiptInclusionFailed();

        // 2. Parse receipt RLP
        // Strip EIP-2718 typed transaction prefix byte if present (< 0x80)
        bytes memory rlpPayload;
        if (receiptRlp.length == 0) revert InvalidReceiptEncoding();

        uint8 firstByte = uint8(receiptRlp[0]);
        if (firstByte < 0x80) {
            // Typed receipt: slice out first byte
            rlpPayload = new bytes(receiptRlp.length - 1);
            for (uint256 i = 0; i < rlpPayload.length; i++) {
                rlpPayload[i] = receiptRlp[i + 1];
            }
        } else {
            rlpPayload = receiptRlp;
        }

        RLPReader.RLPItem memory receiptItem = rlpPayload.toRlpItem();
        if (!receiptItem.isList()) revert InvalidReceiptEncoding();

        RLPReader.RLPItem[] memory receiptFields = receiptItem.toList();
        if (receiptFields.length < 4) revert InvalidReceiptEncoding();

        // Field 0: status (1 for success)
        uint256 status = receiptFields[0].toUint();
        if (status != 1) revert ReceiptStatusFailed();

        // Field 3: logs list
        RLPReader.RLPItem memory logsItem = receiptFields[3];
        if (!logsItem.isList()) revert InvalidReceiptEncoding();
        RLPReader.RLPItem[] memory logList = logsItem.toList();

        bool eventFound = false;

        for (uint256 i = 0; i < logList.length; i++) {
            RLPReader.RLPItem[] memory logFields = logList[i].toList();
            if (logFields.length < 3) continue;

            address emitter = logFields[0].toAddress();
            if (emitter != expectedSourceContract) continue;

            RLPReader.RLPItem[] memory topics = logFields[1].toList();
            if (topics.length < 4) continue;

            bytes32 topic0 = topics[0].toBytes32();
            if (topic0 != MESSAGE_DISPATCHED_TOPIC) continue;

            bytes32 logMessageId = topics[1].toBytes32();
            uint256 logSourceChainId = topics[2].toUint();
            uint256 logDestChainId = topics[3].toUint();

            bytes memory logData = logFields[2].toBytes();

            (
                address sourceContract,
                address destinationReceiver,
                uint256 nonce,
                bytes memory payload,
                bytes32 payloadHash
            ) = abi.decode(logData, (address, address, uint256, bytes, bytes32));

            if (sourceContract != expectedSourceContract) {
                revert SourceContractMismatch(expectedSourceContract, sourceContract);
            }

            if (keccak256(payload) != payloadHash) {
                revert PayloadHashMismatch(payloadHash, keccak256(payload));
            }

            bytes32 computedMessageId = keccak256(
                abi.encode(
                    MESSAGE_TYPEHASH,
                    logSourceChainId,
                    sourceContract,
                    logDestChainId,
                    destinationReceiver,
                    nonce,
                    payloadHash
                )
            );

            if (computedMessageId != logMessageId) {
                revert MessageIdMismatch(logMessageId, computedMessageId);
            }

            verifiedEvent = VerifiedCrossChainEvent({
                messageId: logMessageId,
                sourceChainId: logSourceChainId,
                destinationChainId: logDestChainId,
                sourceContract: sourceContract,
                destinationReceiver: destinationReceiver,
                nonce: nonce,
                payload: payload,
                payloadHash: payloadHash
            });

            eventFound = true;
            break;
        }

        if (!eventFound) revert EventNotFoundInReceipt();
    }
}
