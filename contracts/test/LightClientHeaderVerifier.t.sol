// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {LightClientHeaderVerifier} from "../src/verifiers/LightClientHeaderVerifier.sol";
import {RLPReader} from "../src/libraries/RLPReader.sol";

contract LightClientHeaderVerifierTest is Test {
    LightClientHeaderVerifier public verifier;

    uint256 public constant SOURCE_CHAIN = 31337;
    uint256 public trustedSignerKey = 0xA11CE;
    address public trustedSigner;

    uint256 public blockNumber = 120;
    bytes32 public receiptsRoot = bytes32(uint256(0x5555));
    bytes32 public blockHash;
    bytes public headerRlp;
    bytes public validSignature;

    function setUp() public {
        trustedSigner = vm.addr(trustedSignerKey);
        verifier = new LightClientHeaderVerifier(
            SOURCE_CHAIN,
            trustedSigner,
            bytes32(0),
            0
        );

        // Build a valid 9-item Execution Block Header RLP:
        // [0: parentHash, 1: ommersHash, 2: beneficiary, 3: stateRoot, 4: txRoot, 5: receiptsRoot, 6: logsBloom, 7: difficulty, 8: number]
        headerRlp = _buildHeaderRlp(blockNumber, receiptsRoot);
        blockHash = keccak256(headerRlp);

        // Sign consensus attestation: (blockHash, blockNumber, sourceChainId)
        bytes32 messageHash = keccak256(abi.encodePacked(blockHash, blockNumber, SOURCE_CHAIN));
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(trustedSignerKey, digest);
        validSignature = abi.encodePacked(r, s, v);
    }

    function test_VerifyValidConsensusHeader() public view {
        bytes memory proof = abi.encode(headerRlp, validSignature);
        bool valid = verifier.verifySourceHeader(
            SOURCE_CHAIN,
            blockNumber,
            blockHash,
            receiptsRoot,
            proof
        );
        assertTrue(valid);
    }

    function test_RevertIf_MismatchedBlockHash() public {
        bytes memory proof = abi.encode(headerRlp, validSignature);
        bytes32 forgedHash = bytes32(uint256(0x9999));

        vm.expectRevert(
            abi.encodeWithSelector(
                LightClientHeaderVerifier.HeaderRLPHashMismatch.selector,
                blockHash,
                forgedHash
            )
        );
        verifier.verifySourceHeader(SOURCE_CHAIN, blockNumber, forgedHash, receiptsRoot, proof);
    }

    function test_RevertIf_MismatchedReceiptsRoot() public {
        bytes memory proof = abi.encode(headerRlp, validSignature);
        bytes32 wrongRoot = bytes32(uint256(0x7777));

        vm.expectRevert(
            abi.encodeWithSelector(
                LightClientHeaderVerifier.ReceiptsRootMismatch.selector,
                receiptsRoot,
                wrongRoot
            )
        );
        verifier.verifySourceHeader(SOURCE_CHAIN, blockNumber, blockHash, wrongRoot, proof);
    }

    function test_RevertIf_MismatchedBlockNumber() public {
        bytes memory proof = abi.encode(headerRlp, validSignature);

        vm.expectRevert(
            abi.encodeWithSelector(
                LightClientHeaderVerifier.BlockNumberMismatch.selector,
                blockNumber,
                999
            )
        );
        verifier.verifySourceHeader(SOURCE_CHAIN, 999, blockHash, receiptsRoot, proof);
    }

    function test_RevertIf_ForgedSignature() public {
        uint256 imposterKey = 0xBAD;
        bytes32 messageHash = keccak256(abi.encodePacked(blockHash, blockNumber, SOURCE_CHAIN));
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(imposterKey, digest);
        bytes memory forgedSignature = abi.encodePacked(r, s, v);

        bytes memory proof = abi.encode(headerRlp, forgedSignature);

        vm.expectRevert(LightClientHeaderVerifier.InvalidConsensusProof.selector);
        verifier.verifySourceHeader(SOURCE_CHAIN, blockNumber, blockHash, receiptsRoot, proof);
    }

    function test_RevertIf_BlockOlderThanCheckpoint() public {
        // Advance checkpoint slot to 200
        verifier.updateCheckpoint(bytes32(uint256(1)), 200, trustedSigner);
        bytes memory proof = abi.encode(headerRlp, validSignature);

        vm.expectRevert(
            abi.encodeWithSelector(
                LightClientHeaderVerifier.BlockOlderThanFinalizedCheckpoint.selector,
                blockNumber,
                200
            )
        );
        verifier.verifySourceHeader(SOURCE_CHAIN, blockNumber, blockHash, receiptsRoot, proof);
    }

    function test_TrustModelDescription() public view {
        string memory tm = verifier.getTrustModel();
        assertTrue(bytes(tm).length > 0);
        assertEq(
            tm,
            "MODE_B_ATTESTATION_VERIFIER: Execution header RLP verified with receiptsRoot extraction; consensus is authenticated via designated committee signer checkpoint. Full PoS sync committee verification is not yet integrated."
        );
    }

    function _buildHeaderRlp(uint256 num, bytes32 root) internal pure returns (bytes memory) {
        bytes memory h32 = abi.encodePacked(bytes1(0xa0), bytes32(uint256(1)));
        bytes memory addr = abi.encodePacked(bytes1(0x94), address(0x1));
        bytes memory rootRlp = abi.encodePacked(bytes1(0xa0), root);
        bytes memory numRlp;
        if (num < 128) {
            numRlp = abi.encodePacked(bytes1(uint8(num)));
        } else {
            numRlp = abi.encodePacked(bytes1(0x81), bytes1(uint8(num)));
        }

        // Bloom: 256 zero bytes
        bytes memory zeros = new bytes(256);
        bytes memory bloomRlp = abi.encodePacked(bytes1(0xb9), bytes2(0x0100), zeros);

        bytes memory payload = abi.encodePacked(
            h32, // 0: parentHash
            h32, // 1: ommersHash
            addr, // 2: beneficiary
            h32, // 3: stateRoot
            h32, // 4: txRoot
            rootRlp, // 5: receiptsRoot
            bloomRlp, // 6: logsBloom
            abi.encodePacked(bytes1(0x81), bytes1(0x01)), // 7: difficulty
            numRlp // 8: number
        );

        bytes memory lenBytes = _toMinimalBytes(payload.length);
        return abi.encodePacked(bytes1(uint8(0xf7 + lenBytes.length)), lenBytes, payload);
    }

    function _toMinimalBytes(uint256 val) internal pure returns (bytes memory) {
        uint256 temp = val;
        uint256 len = 0;
        while (temp > 0) {
            len++;
            temp >>= 8;
        }
        bytes memory res = new bytes(len);
        for (uint256 i = 0; i < len; i++) {
            res[len - 1 - i] = bytes1(uint8(val & 0xff));
            val >>= 8;
        }
        return res;
    }
}
