// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DestinationVerifier} from "../src/DestinationVerifier.sol";
import {IDestinationVerifier} from "../src/interfaces/IDestinationVerifier.sol";
import {DevHeaderOracle} from "../src/verifiers/DevHeaderOracle.sol";
import {ReceiptVerifier} from "../src/verifiers/ReceiptVerifier.sol";
import {CrossProofReceiver} from "../src/receivers/CrossProofReceiver.sol";
import {ProofTestHelper} from "./utils/ProofTestHelper.sol";

contract DestinationVerifierTest is Test {
    DestinationVerifier public verifier;
    DevHeaderOracle public headerOracle;
    ReceiptVerifier public receiptVerifier;
    CrossProofReceiver public appReceiver;
    ProofTestHelper public helper;

    address public relayer = address(0xAA);
    address public attacker = address(0xBAD);

    address public sourceBridge = address(0x1111111111111111111111111111111111111111);
    uint256 public sourceChainId = 31337;
    uint256 public destChainId; // will be block.chainid

    uint256 public blockNumber = 42;
    bytes32 public blockHash = bytes32(uint256(0xBBBB));
    bytes32 public receiptsRoot;
    bytes[] public mptProof;
    bytes public receiptRlp;

    bytes public payload = "CrossProof Authenticated Cross-Chain Payload";
    bytes32 public payloadHash;
    bytes32 public messageId;
    uint256 public nonce = 1;

    function setUp() public {
        destChainId = block.chainid;
        helper = new ProofTestHelper();

        // 1. Deploy verifiers
        headerOracle = new DevHeaderOracle(relayer);
        receiptVerifier = new ReceiptVerifier();
        verifier = new DestinationVerifier(address(headerOracle), address(receiptVerifier));

        // 2. Deploy app receiver
        appReceiver = new CrossProofReceiver(address(verifier));

        // 3. Configure trusted source bridge
        verifier.setSourceBridge(sourceChainId, sourceBridge);

        // 4. Construct authentic proof data
        payloadHash = keccak256(payload);
        messageId = keccak256(
            abi.encode(
                receiptVerifier.MESSAGE_TYPEHASH(),
                sourceChainId,
                sourceBridge,
                destChainId,
                address(appReceiver),
                nonce,
                payloadHash
            )
        );

        receiptRlp = helper.buildReceiptRlp(
            sourceBridge,
            messageId,
            sourceChainId,
            destChainId,
            address(appReceiver),
            nonce,
            payload,
            payloadHash,
            1 // success status
        );

        (receiptsRoot, mptProof) = helper.buildSingleNodeMPTProof(receiptRlp);

        // 5. Commit source header into headerOracle
        vm.prank(relayer);
        headerOracle.commitSourceHeader(sourceChainId, blockNumber, blockHash, receiptsRoot);
    }

    function _buildValidProof() internal view returns (IDestinationVerifier.CrossChainProof memory) {
        return
            IDestinationVerifier.CrossChainProof({
                sourceChainId: sourceChainId,
                sourceContract: sourceBridge,
                blockNumber: blockNumber,
                blockHash: blockHash,
                receiptsRoot: receiptsRoot,
                txIndex: 0,
                receiptRlp: receiptRlp,
                mptProof: mptProof,
                payload: payload
            });
    }

    function test_EndToEndValidVerificationAndExecution() public {
        IDestinationVerifier.CrossChainProof memory proof = _buildValidProof();

        vm.expectEmit(true, true, true, false);
        emit IDestinationVerifier.MessageVerified(
            messageId,
            sourceChainId,
            sourceBridge,
            address(appReceiver),
            nonce,
            blockNumber,
            0
        );

        bytes32 verifiedId = verifier.verifyAndExecute(proof, "");
        assertEq(verifiedId, messageId);

        // Verify state is recorded
        assertTrue(verifier.isMessageProcessed(messageId));

        IDestinationVerifier.VerificationRecord memory rec = verifier.getVerificationRecord(messageId);
        assertEq(rec.messageId, messageId);
        assertEq(rec.sourceChainId, sourceChainId);
        assertEq(rec.sourceContract, sourceBridge);
        assertEq(rec.destinationReceiver, address(appReceiver));
        assertEq(rec.executed, true);

        // Verify receiver state updated
        assertEq(appReceiver.totalMessagesReceived(), 1);
        assertEq(appReceiver.lastProcessedMessageId(), messageId);
        assertEq(appReceiver.lastMessageContent(), string(payload));
    }

    function test_RevertIf_ReplayMessage() public {
        IDestinationVerifier.CrossChainProof memory proof = _buildValidProof();

        // First execution succeeds
        verifier.verifyAndExecute(proof, "");
        assertTrue(verifier.isMessageProcessed(messageId));

        // Replay attempt must revert
        vm.expectRevert(
            abi.encodeWithSelector(DestinationVerifier.MessageAlreadyProcessed.selector, messageId)
        );
        verifier.verifyAndExecute(proof, "");
    }

    function test_RevertIf_TamperedProofNode() public {
        IDestinationVerifier.CrossChainProof memory proof = _buildValidProof();
        proof.mptProof[0] = hex"deadbeef"; // Tampered node

        vm.expectRevert();
        verifier.verifyAndExecute(proof, "");
    }

    function test_RevertIf_PayloadSubstitution() public {
        IDestinationVerifier.CrossChainProof memory proof = _buildValidProof();
        proof.payload = "Attacker Substituted Malicious Payload";

        vm.expectRevert(
            abi.encodeWithSelector(
                DestinationVerifier.PayloadHashMismatch.selector,
                payloadHash,
                keccak256(proof.payload)
            )
        );
        verifier.verifyAndExecute(proof, "");
    }

    function test_RevertIf_UntrustedSourceBridge() public {
        IDestinationVerifier.CrossChainProof memory proof = _buildValidProof();
        proof.sourceContract = address(0x999);

        vm.expectRevert(
            abi.encodeWithSelector(
                DestinationVerifier.InvalidSourceContract.selector,
                sourceBridge,
                address(0x999)
            )
        );
        verifier.verifyAndExecute(proof, "");
    }

    function test_RevertIf_UnconfiguredSourceChain() public {
        IDestinationVerifier.CrossChainProof memory proof = _buildValidProof();
        proof.sourceChainId = 999999;

        vm.expectRevert(
            abi.encodeWithSelector(DestinationVerifier.SourceChainNotConfigured.selector, 999999)
        );
        verifier.verifyAndExecute(proof, "");
    }

    function test_RevertIf_UnverifiedHeader() public {
        IDestinationVerifier.CrossChainProof memory proof = _buildValidProof();
        proof.blockNumber = 999; // Not committed

        vm.expectRevert();
        verifier.verifyAndExecute(proof, "");
    }

    function test_RevertIf_WrongDestinationChain() public {
        // Build receipt targeting chain 99999 instead of destChainId
        bytes32 wrongDestMsgId = keccak256(
            abi.encode(
                receiptVerifier.MESSAGE_TYPEHASH(),
                sourceChainId,
                sourceBridge,
                99999, // wrong destination
                address(appReceiver),
                nonce,
                payloadHash
            )
        );

        bytes memory wrongDestReceipt = helper.buildReceiptRlp(
            sourceBridge,
            wrongDestMsgId,
            sourceChainId,
            99999,
            address(appReceiver),
            nonce,
            payload,
            payloadHash,
            1
        );

        (bytes32 wrongRoot, bytes[] memory wrongProof) = helper.buildSingleNodeMPTProof(
            wrongDestReceipt
        );

        vm.prank(relayer);
        headerOracle.commitSourceHeader(sourceChainId, 101, blockHash, wrongRoot);

        IDestinationVerifier.CrossChainProof memory proof = IDestinationVerifier.CrossChainProof({
            sourceChainId: sourceChainId,
            sourceContract: sourceBridge,
            blockNumber: 101,
            blockHash: blockHash,
            receiptsRoot: wrongRoot,
            txIndex: 0,
            receiptRlp: wrongDestReceipt,
            mptProof: wrongProof,
            payload: payload
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                DestinationVerifier.InvalidDestinationChainId.selector,
                block.chainid,
                99999
            )
        );
        verifier.verifyAndExecute(proof, "");
    }

    function test_RevertIf_UnauthorizedAdmin() public {
        vm.prank(attacker);
        vm.expectRevert(DestinationVerifier.Unauthorized.selector);
        verifier.setSourceBridge(1, address(0x1));
    }

    function test_RevertIf_FailedSourceTransaction() public {
        bytes memory failedReceiptRlp = helper.buildReceiptRlp(
            sourceBridge,
            messageId,
            sourceChainId,
            destChainId,
            address(appReceiver),
            nonce,
            payload,
            payloadHash,
            0 // status = 0 (failed)
        );

        (bytes32 failedRoot, bytes[] memory failedProof) = helper.buildSingleNodeMPTProof(
            failedReceiptRlp
        );

        vm.prank(relayer);
        headerOracle.commitSourceHeader(sourceChainId, 202, blockHash, failedRoot);

        IDestinationVerifier.CrossChainProof memory proof = IDestinationVerifier.CrossChainProof({
            sourceChainId: sourceChainId,
            sourceContract: sourceBridge,
            blockNumber: 202,
            blockHash: blockHash,
            receiptsRoot: failedRoot,
            txIndex: 0,
            receiptRlp: failedReceiptRlp,
            mptProof: failedProof,
            payload: payload
        });

        vm.expectRevert(ReceiptVerifier.ReceiptStatusFailed.selector);
        verifier.verifyAndExecute(proof, "");
    }

    function test_RevertIf_IncorrectTxIndex() public {
        IDestinationVerifier.CrossChainProof memory proof = _buildValidProof();
        proof.txIndex = 1; // Wrong tx index (proof built for index 0)

        vm.expectRevert();
        verifier.verifyAndExecute(proof, "");
    }
}
