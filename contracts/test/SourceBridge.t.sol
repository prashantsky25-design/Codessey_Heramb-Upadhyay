// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {SourceBridge} from "../src/SourceBridge.sol";
import {ISourceBridge} from "../src/interfaces/ISourceBridge.sol";

contract SourceBridgeTest is Test {
    SourceBridge public bridge;
    address public constant RECEIVER = address(0x1234567890123456789012345678901234567890);
    uint256 public constant DEST_CHAIN = 31338;

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

    function setUp() public {
        bridge = new SourceBridge();
    }

    function test_DispatchValidMessage() public {
        bytes memory payload = "Hello CrossProof";
        bytes32 expectedPayloadHash = keccak256(payload);

        bytes32 expectedId = bridge.computeMessageId(
            block.chainid,
            address(bridge),
            DEST_CHAIN,
            RECEIVER,
            1,
            expectedPayloadHash
        );

        vm.expectEmit(true, true, true, true);
        emit MessageDispatched(
            expectedId,
            block.chainid,
            DEST_CHAIN,
            address(bridge),
            RECEIVER,
            1,
            payload,
            expectedPayloadHash
        );

        (bytes32 messageId, uint256 nonce) = bridge.dispatchMessage(DEST_CHAIN, RECEIVER, payload);

        assertEq(messageId, expectedId);
        assertEq(nonce, 1);
        assertEq(bridge.nonceCounter(), 1);
    }

    function test_NonceMonotonicity() public {
        bytes memory payload = "Msg";
        for (uint256 i = 1; i <= 5; i++) {
            (, uint256 nonce) = bridge.dispatchMessage(DEST_CHAIN, RECEIVER, payload);
            assertEq(nonce, i);
        }
        assertEq(bridge.nonceCounter(), 5);
    }

    function test_RevertIf_DestinationSameAsSource() public {
        vm.expectRevert(SourceBridge.InvalidDestinationChainId.selector);
        bridge.dispatchMessage(block.chainid, RECEIVER, "test");
    }

    function test_RevertIf_ZeroDestinationChain() public {
        vm.expectRevert(SourceBridge.InvalidDestinationChainId.selector);
        bridge.dispatchMessage(0, RECEIVER, "test");
    }

    function test_RevertIf_ZeroReceiver() public {
        vm.expectRevert(SourceBridge.InvalidDestinationReceiver.selector);
        bridge.dispatchMessage(DEST_CHAIN, address(0), "test");
    }

    function test_RevertIf_EmptyPayload() public {
        vm.expectRevert(SourceBridge.EmptyPayload.selector);
        bridge.dispatchMessage(DEST_CHAIN, RECEIVER, "");
    }

    function test_ComputeMessageId_UniquePerNonce() public view {
        bytes32 hash1 = bridge.computeMessageId(1, address(1), 2, address(2), 1, keccak256("data"));
        bytes32 hash2 = bridge.computeMessageId(1, address(1), 2, address(2), 2, keccak256("data"));
        assertTrue(hash1 != hash2);
    }

    function test_ComputeMessageId_UniquePerChain() public view {
        bytes32 hash1 = bridge.computeMessageId(1, address(1), 2, address(2), 1, keccak256("data"));
        bytes32 hash2 = bridge.computeMessageId(1, address(1), 3, address(2), 1, keccak256("data"));
        assertTrue(hash1 != hash2);
    }

    function testFuzz_DispatchMessage(bytes calldata payload, address receiver, uint256 destChainId) public {
        vm.assume(payload.length > 0);
        vm.assume(receiver != address(0));
        vm.assume(destChainId != block.chainid && destChainId != 0);

        (bytes32 id, uint256 nonce) = bridge.dispatchMessage(destChainId, receiver, payload);
        assertTrue(id != bytes32(0));
        assertEq(nonce, 1);
    }
}
