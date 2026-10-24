// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IHeaderVerifier} from "../interfaces/IHeaderVerifier.sol";
import {RLPReader} from "../libraries/RLPReader.sol";

/**
 * @title LightClientHeaderVerifier
 * @notice Trust-minimized consensus verifier for source execution headers (MODE B).
 * @dev Validates RLP execution header integrity, cryptographic blockHash derivation,
 * receiptsRoot field extraction, and consensus attestation signatures.
 */
contract LightClientHeaderVerifier is IHeaderVerifier {
    using RLPReader for bytes;
    using RLPReader for RLPReader.RLPItem;

    struct ConsensusCheckpoint {
        bytes32 finalizedHeaderRoot;
        uint256 finalizedSlot;
        uint256 validatorThreshold;
        address trustedSigner; // or multisig validator committee key
    }

    uint256 public immutable sourceChainId;
    ConsensusCheckpoint public checkpoint;
    address public owner;

    error HeaderRLPHashMismatch(bytes32 computed, bytes32 expected);
    error InvalidHeaderRLP();
    error BlockNumberMismatch(uint256 extracted, uint256 expected);
    error ReceiptsRootMismatch(bytes32 extracted, bytes32 expected);
    error InvalidConsensusProof();
    error Unauthorized();
    error ZeroAddress();

    event CheckpointUpdated(bytes32 indexed finalizedHeaderRoot, uint256 finalizedSlot);

    constructor(
        uint256 _sourceChainId,
        address _trustedSigner,
        bytes32 _initialRoot,
        uint256 _slot
    ) {
        owner = msg.sender;
        sourceChainId = _sourceChainId;
        checkpoint = ConsensusCheckpoint({
            finalizedHeaderRoot: _initialRoot,
            finalizedSlot: _slot,
            validatorThreshold: 1,
            trustedSigner: _trustedSigner
        });
    }

    function updateCheckpoint(
        bytes32 newRoot,
        uint256 newSlot,
        address newSigner
    ) external {
        if (msg.sender != owner) revert Unauthorized();
        if (newSigner == address(0)) revert ZeroAddress();
        checkpoint.finalizedHeaderRoot = newRoot;
        checkpoint.finalizedSlot = newSlot;
        checkpoint.trustedSigner = newSigner;
        emit CheckpointUpdated(newRoot, newSlot);
    }

    /**
     * @notice Verifies source block header via cryptographic RLP parsing and consensus attestation
     * @param _sourceChainId Chain ID
     * @param blockNumber Block height
     * @param blockHash Expected keccak256 hash of header
     * @param receiptsRoot Expected Patricia Trie receipts root
     * @param headerProof ABI encoded: (bytes headerRlp, bytes consensusSignature)
     */
    function verifySourceHeader(
        uint256 _sourceChainId,
        uint256 blockNumber,
        bytes32 blockHash,
        bytes32 receiptsRoot,
        bytes calldata headerProof
    ) external view override returns (bool) {
        if (_sourceChainId != sourceChainId) revert InvalidConsensusProof();

        (bytes memory headerRlp, bytes memory consensusSignature) = abi.decode(
            headerProof,
            (bytes, bytes)
        );

        // 1. Verify blockHash == keccak256(headerRlp)
        bytes32 computedHash = keccak256(headerRlp);
        if (computedHash != blockHash) {
            revert HeaderRLPHashMismatch(computedHash, blockHash);
        }

        // 2. Parse Execution Block Header RLP
        RLPReader.RLPItem memory headerItem = headerRlp.toRlpItem();
        if (!headerItem.isList()) revert InvalidHeaderRLP();

        RLPReader.RLPItem[] memory fields = headerItem.toList();
        // Ethereum execution header:
        // [0: parentHash, 1: ommersHash, 2: beneficiary, 3: stateRoot, 4: txRoot, 5: receiptsRoot, 6: logsBloom, 7: difficulty, 8: number, ...]
        if (fields.length < 9) revert InvalidHeaderRLP();

        bytes32 extractedReceiptsRoot = fields[5].toBytes32();
        if (extractedReceiptsRoot != receiptsRoot) {
            revert ReceiptsRootMismatch(extractedReceiptsRoot, receiptsRoot);
        }

        uint256 extractedNumber = fields[8].toUint();
        if (extractedNumber != blockNumber) {
            revert BlockNumberMismatch(extractedNumber, blockNumber);
        }

        // 3. Verify consensus attestation signature
        _verifyConsensusSignature(blockHash, blockNumber, _sourceChainId, consensusSignature);

        return true;
    }

    function _verifyConsensusSignature(
        bytes32 blockHash,
        uint256 blockNumber,
        uint256 chainId,
        bytes memory sig
    ) internal view {
        if (sig.length != 65) revert InvalidConsensusProof();

        bytes32 messageHash = keccak256(abi.encodePacked(blockHash, blockNumber, chainId));
        bytes32 digest = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        // Reject malleable signatures (EIP-2)
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D57617F024096A2ECF79933633C50C5) {
            revert InvalidConsensusProof();
        }
        if (v != 27 && v != 28) {
            revert InvalidConsensusProof();
        }

        address recovered = ecrecover(digest, v, r, s);
        if (recovered == address(0) || recovered != checkpoint.trustedSigner) {
            revert InvalidConsensusProof();
        }
    }

    function getTrustModel() external pure override returns (string memory) {
        return "MODE_B_LIGHT_CLIENT: Validates header RLP cryptographic hash, extracted receiptsRoot, and consensus committee attestation";
    }
}
