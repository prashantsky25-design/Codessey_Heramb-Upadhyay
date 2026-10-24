// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {RLPReader} from "./RLPReader.sol";

/**
 * @title MPTProof
 * @notice Cryptographic verification of Ethereum Merkle Patricia Trie proofs
 */
library MPTProof {
    using RLPReader for bytes;
    using RLPReader for RLPReader.RLPItem;

    error InvalidMPTProof(string reason);

    /**
     * @notice Verifies that key (RLP-encoded txIndex) maps to value (receiptRlp) under rootHash
     */
    function verifyMPTProof(
        bytes32 rootHash,
        uint256 txIndex,
        bytes[] calldata proof,
        bytes calldata expectedValue
    ) internal pure returns (bool) {
        if (proof.length == 0) revert InvalidMPTProof("Empty proof");

        bytes memory keyBytes = _encodeTxIndexToRLP(txIndex);
        bytes memory keyNibbles = _bytesToNibbles(keyBytes);

        bytes32 expectedHash = rootHash;
        uint256 nibbleOffset = 0;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes calldata nodeBytes = proof[i];

            // Verify node hash matches expected hash (unless first or inline)
            if (i == 0) {
                if (keccak256(nodeBytes) != rootHash) {
                    revert InvalidMPTProof("Root hash mismatch");
                }
            } else {
                if (keccak256(nodeBytes) != expectedHash) {
                    revert InvalidMPTProof("Intermediate node hash mismatch");
                }
            }

            RLPReader.RLPItem memory nodeItem = nodeBytes.toRlpItem();
            if (!nodeItem.isList()) {
                revert InvalidMPTProof("Node is not a list");
            }

            uint256 itemCount = nodeItem.numItems();

            if (itemCount == 17) {
                // Branch node
                if (nibbleOffset == keyNibbles.length) {
                    // Value is at index 16
                    RLPReader.RLPItem memory valueItem = nodeItem.getItemAtIndex(16);
                    bytes memory val = valueItem.toBytes();
                    return _bytesEqual(val, expectedValue);
                }

                uint8 nibble = uint8(keyNibbles[nibbleOffset]);
                if (nibble > 15) revert InvalidMPTProof("Invalid nibble");

                RLPReader.RLPItem memory childItem = nodeItem.getItemAtIndex(nibble);
                bytes memory childBytes = childItem.toBytes();
                if (childBytes.length == 0) {
                    revert InvalidMPTProof("Key path not found in branch");
                }

                if (childBytes.length == 32) {
                    expectedHash = bytes32(childBytes);
                } else {
                    // Inline child node
                    expectedHash = keccak256(childItem.toRawBytes());
                }
                nibbleOffset += 1;
            } else if (itemCount == 2) {
                // Extension or Leaf node
                RLPReader.RLPItem memory pathItem = nodeItem.getItemAtIndex(0);
                bytes memory encodedPath = pathItem.toBytes();
                (bytes memory nodeNibbles, bool isLeaf) = _decodeCompactPath(encodedPath);

                // Check path match
                for (uint256 k = 0; k < nodeNibbles.length; k++) {
                    if (nibbleOffset + k >= keyNibbles.length) {
                        revert InvalidMPTProof("Path overflow");
                    }
                    if (nodeNibbles[k] != keyNibbles[nibbleOffset + k]) {
                        revert InvalidMPTProof("Path nibbles mismatch");
                    }
                }
                nibbleOffset += nodeNibbles.length;

                RLPReader.RLPItem memory valueItem = nodeItem.getItemAtIndex(1);

                if (isLeaf) {
                    if (nibbleOffset != keyNibbles.length) {
                        revert InvalidMPTProof("Leaf reached before key exhausted");
                    }
                    bytes memory val = valueItem.toBytes();
                    return _bytesEqual(val, expectedValue);
                } else {
                    // Extension node
                    bytes memory childBytes = valueItem.toBytes();
                    if (childBytes.length == 32) {
                        expectedHash = bytes32(childBytes);
                    } else {
                        expectedHash = keccak256(valueItem.toRawBytes());
                    }
                }
            } else {
                revert InvalidMPTProof("Invalid node item count");
            }
        }

        revert InvalidMPTProof("Proof ended before reaching leaf");
    }

    function _encodeTxIndexToRLP(uint256 txIndex) internal pure returns (bytes memory) {
        if (txIndex == 0) {
            bytes memory b = new bytes(1);
            b[0] = 0x80;
            return b;
        } else if (txIndex < 128) {
            bytes memory b = new bytes(1);
            b[0] = bytes1(uint8(txIndex));
            return b;
        } else {
            // Encode as RLP uint
            uint256 temp = txIndex;
            uint256 len = 0;
            while (temp > 0) {
                len++;
                temp >>= 8;
            }
            bytes memory result = new bytes(1 + len);
            result[0] = bytes1(uint8(0x80 + len));
            for (uint256 i = 0; i < len; i++) {
                result[len - i] = bytes1(uint8(txIndex & 0xff));
                txIndex >>= 8;
            }
            return result;
        }
    }

    function _bytesToNibbles(bytes memory b) internal pure returns (bytes memory) {
        bytes memory nibbles = new bytes(b.length * 2);
        for (uint256 i = 0; i < b.length; i++) {
            nibbles[i * 2] = bytes1(uint8(b[i]) >> 4);
            nibbles[i * 2 + 1] = bytes1(uint8(b[i]) & 0x0f);
        }
        return nibbles;
    }

    function _decodeCompactPath(bytes memory compact)
        internal
        pure
        returns (bytes memory path, bool isLeaf)
    {
        if (compact.length == 0) revert InvalidMPTProof("Empty compact path");
        uint8 firstByte = uint8(compact[0]);
        uint8 flag = firstByte >> 4;
        isLeaf = (flag == 2 || flag == 3);
        bool isOdd = (flag == 1 || flag == 3);

        if (isOdd) {
            path = new bytes((compact.length - 1) * 2 + 1);
            path[0] = bytes1(firstByte & 0x0f);
            for (uint256 i = 1; i < compact.length; i++) {
                path[1 + (i - 1) * 2] = bytes1(uint8(compact[i]) >> 4);
                path[1 + (i - 1) * 2 + 1] = bytes1(uint8(compact[i]) & 0x0f);
            }
        } else {
            path = new bytes((compact.length - 1) * 2);
            for (uint256 i = 1; i < compact.length; i++) {
                path[(i - 1) * 2] = bytes1(uint8(compact[i]) >> 4);
                path[(i - 1) * 2 + 1] = bytes1(uint8(compact[i]) & 0x0f);
            }
        }
    }

    function _bytesEqual(bytes memory a, bytes memory b) internal pure returns (bool) {
        return keccak256(a) == keccak256(b);
    }
}
