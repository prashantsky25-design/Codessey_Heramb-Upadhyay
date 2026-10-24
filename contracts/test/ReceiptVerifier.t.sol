// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ReceiptVerifier} from "../src/verifiers/ReceiptVerifier.sol";
import {IReceiptVerifier} from "../src/interfaces/IReceiptVerifier.sol";
import {MPTProof} from "../src/libraries/MPTProof.sol";
import {SourceBridge} from "../src/SourceBridge.sol";
import {ProofTestHelper} from "./utils/ProofTestHelper.sol";

contract ReceiptVerifierTest is Test {
    ReceiptVerifier public verifier;
    ProofTestHelper public helper;

    address public sourceContract = address(0x1111111111111111111111111111111111111111);
    address public destinationReceiver = address(0x2222222222222222222222222222222222222222);
    uint256 public sourceChainId = 31337;
    uint256 public destinationChainId = 31338;
    uint256 public nonce = 1;
    bytes public payload = "CrossProof: Cryptographic Cross-Chain Verification";
    bytes32 public payloadHash;
    bytes32 public messageId;

    bytes public receiptRlp;
    bytes32 public receiptsRoot;
    bytes[] public mptProof;

    function setUp() public {
        verifier = new ReceiptVerifier();
        helper = new ProofTestHelper();

        payloadHash = keccak256(payload);

        // Compute valid message ID
        messageId = keccak256(
            abi.encode(
                verifier.MESSAGE_TYPEHASH(),
                sourceChainId,
                sourceContract,
                destinationChainId,
                destinationReceiver,
                nonce,
                payloadHash
            )
        );

        // Build authentic RLP-encoded receipt with status = 1 (success)
        receiptRlp = helper.buildReceiptRlp(
            sourceContract,
            messageId,
            sourceChainId,
            destinationChainId,
            destinationReceiver,
            nonce,
            payload,
            payloadHash,
            1 // status
        );

        // Build single-node Patricia Trie proof for txIndex = 0
        (receiptsRoot, mptProof) = helper.buildSingleNodeMPTProof(receiptRlp);
    }

    function test_ValidReceiptInclusionAndExtraction() public view {
        IReceiptVerifier.VerifiedCrossChainEvent memory ev = verifier
            .verifyReceiptInclusionAndExtractMessage(
                receiptsRoot,
                0, // txIndex = 0
                receiptRlp,
                mptProof,
                sourceContract
            );

        assertEq(ev.messageId, messageId);
        assertEq(ev.sourceChainId, sourceChainId);
        assertEq(ev.destinationChainId, destinationChainId);
        assertEq(ev.sourceContract, sourceContract);
        assertEq(ev.destinationReceiver, destinationReceiver);
        assertEq(ev.nonce, nonce);
        assertEq(ev.payload, payload);
        assertEq(ev.payloadHash, payloadHash);
    }

    function test_RevertIf_TamperedMPTProofNode() public {
        bytes[] memory tamperedProof = new bytes[](1);
        tamperedProof[0] = hex"123456"; // garbage proof node

        vm.expectRevert();
        verifier.verifyReceiptInclusionAndExtractMessage(
            receiptsRoot,
            0,
            receiptRlp,
            tamperedProof,
            sourceContract
        );
    }

    function test_RevertIf_TamperedReceiptRlp() public {
        bytes memory tamperedReceipt = bytes.concat(receiptRlp, hex"ff");

        vm.expectRevert();
        verifier.verifyReceiptInclusionAndExtractMessage(
            receiptsRoot,
            0,
            tamperedReceipt,
            mptProof,
            sourceContract
        );
    }

    function test_RevertIf_WrongTxIndex() public {
        // Proof was built for txIndex = 0, so passing txIndex = 1 must fail
        vm.expectRevert();
        verifier.verifyReceiptInclusionAndExtractMessage(
            receiptsRoot,
            1, // wrong index
            receiptRlp,
            mptProof,
            sourceContract
        );
    }

    function test_RevertIf_FailedReceiptStatus() public {
        // Build receipt with status = 0 (reverted transaction on source chain)
        bytes memory revertedReceipt = helper.buildReceiptRlp(
            sourceContract,
            messageId,
            sourceChainId,
            destinationChainId,
            destinationReceiver,
            nonce,
            payload,
            payloadHash,
            0 // status 0 (failed!)
        );

        (bytes32 rootReverted, bytes[] memory proofReverted) = helper.buildSingleNodeMPTProof(
            revertedReceipt
        );

        vm.expectRevert(ReceiptVerifier.ReceiptStatusFailed.selector);
        verifier.verifyReceiptInclusionAndExtractMessage(
            rootReverted,
            0,
            revertedReceipt,
            proofReverted,
            sourceContract
        );
    }

    function test_RevertIf_WrongSourceContract() public {
        address imposterContract = address(0x9999999999999999999999999999999999999999);

        vm.expectRevert(ReceiptVerifier.EventNotFoundInReceipt.selector);
        verifier.verifyReceiptInclusionAndExtractMessage(
            receiptsRoot,
            0,
            receiptRlp,
            mptProof,
            imposterContract // doesn't match emitter
        );
    }

    function test_RevertIf_TamperedPayloadHash() public {
        bytes32 fakeHash = keccak256("Substituted Payload");

        bytes memory tamperedReceipt = helper.buildReceiptRlp(
            sourceContract,
            messageId,
            sourceChainId,
            destinationChainId,
            destinationReceiver,
            nonce,
            payload,
            fakeHash, // mismatched payload hash!
            1
        );

        (bytes32 tamperedRoot, bytes[] memory tamperedProof) = helper.buildSingleNodeMPTProof(
            tamperedReceipt
        );

        vm.expectRevert(
            abi.encodeWithSelector(ReceiptVerifier.PayloadHashMismatch.selector, fakeHash, payloadHash)
        );
        verifier.verifyReceiptInclusionAndExtractMessage(
            tamperedRoot,
            0,
            tamperedReceipt,
            tamperedProof,
            sourceContract
        );
    }
}
