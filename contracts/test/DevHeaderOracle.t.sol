// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DevHeaderOracle} from "../src/verifiers/DevHeaderOracle.sol";

contract DevHeaderOracleTest is Test {
    DevHeaderOracle public oracle;
    address public owner = address(this);
    address public relayer = address(0xAA);
    address public stranger = address(0xBB);

    uint256 public constant SOURCE_CHAIN = 31337;
    uint256 public constant BLOCK_NUM = 100;
    bytes32 public constant BLOCK_HASH = bytes32(uint256(0x1111));
    bytes32 public constant RECEIPTS_ROOT = bytes32(uint256(0x2222));

    function setUp() public {
        oracle = new DevHeaderOracle(relayer);
    }

    function test_CommitAndVerifyHeader() public {
        vm.prank(relayer);
        oracle.commitSourceHeader(SOURCE_CHAIN, BLOCK_NUM, BLOCK_HASH, RECEIPTS_ROOT);

        bool valid = oracle.verifySourceHeader(SOURCE_CHAIN, BLOCK_NUM, BLOCK_HASH, RECEIPTS_ROOT, "");
        assertTrue(valid);
    }

    function test_RevertIf_HeaderNotFound() public {
        vm.expectRevert(abi.encodeWithSelector(DevHeaderOracle.HeaderNotFound.selector, SOURCE_CHAIN, 999));
        oracle.verifySourceHeader(SOURCE_CHAIN, 999, BLOCK_HASH, RECEIPTS_ROOT, "");
    }

    function test_RevertIf_BlockHashMismatch() public {
        vm.prank(relayer);
        oracle.commitSourceHeader(SOURCE_CHAIN, BLOCK_NUM, BLOCK_HASH, RECEIPTS_ROOT);

        bytes32 wrongHash = bytes32(uint256(0x9999));
        vm.expectRevert(abi.encodeWithSelector(DevHeaderOracle.BlockHashMismatch.selector, BLOCK_HASH, wrongHash));
        oracle.verifySourceHeader(SOURCE_CHAIN, BLOCK_NUM, wrongHash, RECEIPTS_ROOT, "");
    }

    function test_RevertIf_ReceiptsRootMismatch() public {
        vm.prank(relayer);
        oracle.commitSourceHeader(SOURCE_CHAIN, BLOCK_NUM, BLOCK_HASH, RECEIPTS_ROOT);

        bytes32 wrongRoot = bytes32(uint256(0x8888));
        vm.expectRevert(abi.encodeWithSelector(DevHeaderOracle.ReceiptsRootMismatch.selector, RECEIPTS_ROOT, wrongRoot));
        oracle.verifySourceHeader(SOURCE_CHAIN, BLOCK_NUM, BLOCK_HASH, wrongRoot, "");
    }

    function test_RevertIf_UnauthorizedCommit() public {
        vm.prank(stranger);
        vm.expectRevert(DevHeaderOracle.Unauthorized.selector);
        oracle.commitSourceHeader(SOURCE_CHAIN, BLOCK_NUM, BLOCK_HASH, RECEIPTS_ROOT);
    }

    function test_RelayerAuthorization() public {
        oracle.setRelayer(stranger, true);
        assertTrue(oracle.authorizedRelayers(stranger));

        vm.prank(stranger);
        oracle.commitSourceHeader(SOURCE_CHAIN, BLOCK_NUM, BLOCK_HASH, RECEIPTS_ROOT);
        assertTrue(oracle.verifySourceHeader(SOURCE_CHAIN, BLOCK_NUM, BLOCK_HASH, RECEIPTS_ROOT, ""));
    }

    function test_OwnershipTransfer() public {
        oracle.transferOwnership(stranger);
        assertEq(oracle.owner(), stranger);

        vm.expectRevert(DevHeaderOracle.Unauthorized.selector);
        oracle.setRelayer(relayer, false);
    }

    function test_TrustModelDescription() public view {
        string memory trustModel = oracle.getTrustModel();
        assertTrue(bytes(trustModel).length > 0);
    }
}
