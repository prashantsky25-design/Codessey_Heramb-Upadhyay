// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IReceiptVerifier} from "./IReceiptVerifier.sol";

/**
 * @title IDestinationVerifier
 * @notice Top-level destination verifier contract interface
 */
interface IDestinationVerifier {
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

    struct VerificationRecord {
        bytes32 messageId;
        uint256 sourceChainId;
        address sourceContract;
        address destinationReceiver;
        uint256 nonce;
        bytes32 payloadHash;
        uint256 blockNumber;
        uint256 txIndex;
        uint256 verifiedAt;
        bool executed;
    }

    event MessageVerified(
        bytes32 indexed messageId,
        uint256 indexed sourceChainId,
        address indexed sourceContract,
        address destinationReceiver,
        uint256 nonce,
        uint256 blockNumber,
        uint256 txIndex
    );

    event MessageExecuted(
        bytes32 indexed messageId,
        address indexed destinationReceiver,
        bool success
    );

    function verifyAndExecute(
        CrossChainProof calldata proof,
        bytes calldata headerProof
    ) external returns (bytes32 messageId);

    function isMessageProcessed(bytes32 messageId) external view returns (bool);

    function getVerificationRecord(bytes32 messageId)
        external
        view
        returns (VerificationRecord memory);
}
