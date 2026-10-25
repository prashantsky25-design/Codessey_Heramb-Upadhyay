// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IDestinationVerifier} from "./interfaces/IDestinationVerifier.sol";
import {IHeaderVerifier} from "./interfaces/IHeaderVerifier.sol";
import {IReceiptVerifier} from "./interfaces/IReceiptVerifier.sol";
import {IDestinationReceiver} from "./interfaces/IDestinationReceiver.sol";

/**
 * @title DestinationVerifier
 * @notice Verifies cryptographic cross-chain proofs and dispatches verified messages to applications
 */
contract DestinationVerifier is IDestinationVerifier {
    address public owner;
    IHeaderVerifier public headerVerifier;
    IReceiptVerifier public receiptVerifier;

    // sourceChainId => trusted sourceBridge address
    mapping(uint256 => address) public trustedSourceBridges;
    // messageId => processed status
    mapping(bytes32 => bool) public processedMessages;
    // messageId => record
    mapping(bytes32 => VerificationRecord) public verificationRecords;

    event HeaderVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event ReceiptVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event SourceBridgeUpdated(uint256 indexed sourceChainId, address indexed sourceBridge);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error Unauthorized();
    error ZeroAddress();
    error MessageAlreadyProcessed(bytes32 messageId);
    error SourceChainNotConfigured(uint256 sourceChainId);
    error InvalidSourceContract(address expected, address actual);
    error HeaderVerifierNotConfigured();
    error ReceiptVerifierNotConfigured();
    error SourceHeaderVerificationFailed(uint256 chainId, uint256 blockNumber, bytes32 blockHash);
    error InvalidDestinationChainId(uint256 expected, uint256 actual);
    error PayloadHashMismatch(bytes32 expected, bytes32 actual);

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address _headerVerifier, address _receiptVerifier) {
        owner = msg.sender;
        if (_headerVerifier != address(0)) {
            headerVerifier = IHeaderVerifier(_headerVerifier);
            emit HeaderVerifierUpdated(address(0), _headerVerifier);
        }
        if (_receiptVerifier != address(0)) {
            receiptVerifier = IReceiptVerifier(_receiptVerifier);
            emit ReceiptVerifierUpdated(address(0), _receiptVerifier);
        }
    }

    function setHeaderVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) revert ZeroAddress();
        emit HeaderVerifierUpdated(address(headerVerifier), _verifier);
        headerVerifier = IHeaderVerifier(_verifier);
    }

    function setReceiptVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) revert ZeroAddress();
        emit ReceiptVerifierUpdated(address(receiptVerifier), _verifier);
        receiptVerifier = IReceiptVerifier(_verifier);
    }

    function setSourceBridge(uint256 sourceChainId, address sourceBridge) external onlyOwner {
        if (sourceBridge == address(0)) revert ZeroAddress();
        trustedSourceBridges[sourceChainId] = sourceBridge;
        emit SourceBridgeUpdated(sourceChainId, sourceBridge);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function isMessageProcessed(bytes32 messageId) external view override returns (bool) {
        return processedMessages[messageId];
    }

    function getVerificationRecord(bytes32 messageId)
        external
        view
        override
        returns (VerificationRecord memory)
    {
        return verificationRecords[messageId];
    }

    /**
     * @notice Verifies cryptographic source-chain evidence and marks message as verified
     * @dev Follows the Checks-Effects-Interactions (CEI) security pattern.
     *      RECEIVER FAILURE SEMANTICS:
     *      1. Replay flag `processedMessages[messageId] = true` is committed BEFORE invoking the receiver.
     *      2. Application callbacks to `IDestinationReceiver` are wrapped in a try/catch block.
     *      3. If the destination receiver reverts or runs out of gas, the core verification transaction
     *         DOES NOT revert. Instead:
     *           - The message remains permanently recorded as verified (`processedMessages[messageId] = true`).
     *           - `verificationRecords[messageId].executed` is marked `false`.
     *           - `MessageExecuted(messageId, destinationReceiver, false)` is emitted.
     *      4. SECURITY RATIONALE: This guarantees that a misbehaving, gas-guzzling, or malicious
     *         application receiver cannot revert the verification proof transaction, preventing
     *         relayer griefing and reentrancy exploits.
     *      5. In this MVP, failed receiver callbacks are terminal (no automatic retry queue). Production
     *         extensions can introduce a dedicated permissioned `retryExecution()` function.
     */
    function verifyAndExecute(
        CrossChainProof calldata proof,
        bytes calldata headerProof
    ) external override returns (bytes32 messageId) {
        // 1. Validate configured source bridge
        address expectedSourceBridge = trustedSourceBridges[proof.sourceChainId];
        if (expectedSourceBridge == address(0)) {
            revert SourceChainNotConfigured(proof.sourceChainId);
        }

        // 2. Validate source contract identity
        if (proof.sourceContract != expectedSourceBridge) {
            revert InvalidSourceContract(expectedSourceBridge, proof.sourceContract);
        }

        // 3. Verify header authenticity and finality
        if (address(headerVerifier) == address(0)) revert HeaderVerifierNotConfigured();
        bool headerValid = headerVerifier.verifySourceHeader(
            proof.sourceChainId,
            proof.blockNumber,
            proof.blockHash,
            proof.receiptsRoot,
            headerProof
        );
        if (!headerValid) {
            revert SourceHeaderVerificationFailed(
                proof.sourceChainId,
                proof.blockNumber,
                proof.blockHash
            );
        }

        // 4. Verify receipt inclusion and extract authenticated event
        if (address(receiptVerifier) == address(0)) revert ReceiptVerifierNotConfigured();
        IReceiptVerifier.VerifiedCrossChainEvent memory verifiedEv = receiptVerifier
            .verifyReceiptInclusionAndExtractMessage(
                proof.receiptsRoot,
                proof.txIndex,
                proof.receiptRlp,
                proof.mptProof,
                proof.sourceContract
            );

        messageId = verifiedEv.messageId;

        // 5. Replay Protection: ensure message has not been processed
        if (processedMessages[messageId]) {
            revert MessageAlreadyProcessed(messageId);
        }

        // 6. Validate destination chain ID matches this network
        if (verifiedEv.destinationChainId != block.chainid) {
            revert InvalidDestinationChainId(block.chainid, verifiedEv.destinationChainId);
        }

        // 7. Validate payload hash match
        if (keccak256(proof.payload) != verifiedEv.payloadHash) {
            revert PayloadHashMismatch(verifiedEv.payloadHash, keccak256(proof.payload));
        }

        // 8. State update (CEI pattern - Replay Protection Committed First)
        processedMessages[messageId] = true;

        verificationRecords[messageId] = VerificationRecord({
            messageId: messageId,
            sourceChainId: verifiedEv.sourceChainId,
            sourceContract: verifiedEv.sourceContract,
            destinationReceiver: verifiedEv.destinationReceiver,
            nonce: verifiedEv.nonce,
            payloadHash: verifiedEv.payloadHash,
            blockNumber: proof.blockNumber,
            txIndex: proof.txIndex,
            verifiedAt: block.timestamp,
            executed: false
        });

        emit MessageVerified(
            messageId,
            verifiedEv.sourceChainId,
            verifiedEv.sourceContract,
            verifiedEv.destinationReceiver,
            verifiedEv.nonce,
            proof.blockNumber,
            proof.txIndex
        );

        // 9. Execute application receiver with reentrancy & griefing containment
        bool executionSuccess = false;
        if (verifiedEv.destinationReceiver.code.length > 0) {
            try
                IDestinationReceiver(verifiedEv.destinationReceiver).onCrossChainMessage(
                    messageId,
                    verifiedEv.sourceChainId,
                    verifiedEv.sourceContract,
                    proof.payload
                )
            returns (bytes4 selector) {
                if (selector == IDestinationReceiver.onCrossChainMessage.selector) {
                    executionSuccess = true;
                    verificationRecords[messageId].executed = true;
                }
            } catch {
                executionSuccess = false;
            }
        } else {
            // Recipient is an EOA
            executionSuccess = true;
            verificationRecords[messageId].executed = true;
        }

        emit MessageExecuted(messageId, verifiedEv.destinationReceiver, executionSuccess);
    }
}
