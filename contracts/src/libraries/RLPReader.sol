// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RLPReader
 * @notice Robust RLP decoding library for parsing Ethereum receipts, logs, and trie nodes.
 */
library RLPReader {
    uint8 constant STRING_SHORT_START = 0x80;
    uint8 constant STRING_LONG_START = 0xb8;
    uint8 constant LIST_SHORT_START = 0xc0;
    uint8 constant LIST_LONG_START = 0xf8;

    struct RLPItem {
        uint256 len;
        uint256 memPtr;
    }

    struct Iterator {
        RLPItem item;
        uint256 nextPtr;
    }

    error InvalidRLP();
    error RLPItemNotList();
    error RLPIndexOutOfBounds();

    function toRlpItem(bytes memory item) internal pure returns (RLPItem memory) {
        uint256 memPtr;
        assembly {
            memPtr := add(item, 0x20)
        }
        return RLPItem(item.length, memPtr);
    }

    function isList(RLPItem memory item) internal pure returns (bool) {
        if (item.len == 0) return false;
        uint8 byte0;
        uint256 memPtr = item.memPtr;
        assembly {
            byte0 := byte(0, mload(memPtr))
        }
        return byte0 >= LIST_SHORT_START;
    }

    function numItems(RLPItem memory item) internal pure returns (uint256) {
        if (!isList(item)) return 0;
        uint256 count = 0;
        Iterator memory it = iterator(item);
        while (hasNext(it)) {
            next(it);
            count++;
        }
        return count;
    }

    function iterator(RLPItem memory item) internal pure returns (Iterator memory) {
        if (!isList(item)) revert RLPItemNotList();
        (uint256 payloadOffset, ) = _payloadOffset(item.memPtr);
        uint256 ptr = item.memPtr + payloadOffset;
        return Iterator(item, ptr);
    }

    function hasNext(Iterator memory it) internal pure returns (bool) {
        return it.nextPtr < it.item.memPtr + it.item.len;
    }

    function next(Iterator memory it) internal pure returns (RLPItem memory) {
        if (!hasNext(it)) revert RLPIndexOutOfBounds();
        uint256 ptr = it.nextPtr;
        uint256 itemLen = _itemLength(ptr);
        it.nextPtr = ptr + itemLen;
        return RLPItem(itemLen, ptr);
    }

    function getItemAtIndex(RLPItem memory item, uint256 index)
        internal
        pure
        returns (RLPItem memory)
    {
        Iterator memory it = iterator(item);
        for (uint256 i = 0; i < index; i++) {
            if (!hasNext(it)) revert RLPIndexOutOfBounds();
            next(it);
        }
        if (!hasNext(it)) revert RLPIndexOutOfBounds();
        return next(it);
    }

    function toList(RLPItem memory item) internal pure returns (RLPItem[] memory) {
        if (!isList(item)) revert RLPItemNotList();
        uint256 count = numItems(item);
        RLPItem[] memory result = new RLPItem[](count);
        Iterator memory it = iterator(item);
        for (uint256 i = 0; i < count; i++) {
            result[i] = next(it);
        }
        return result;
    }

    function toBytes(RLPItem memory item) internal pure returns (bytes memory) {
        if (item.len == 0) return new bytes(0);
        (uint256 offset, uint256 length) = _payloadOffset(item.memPtr);
        bytes memory result = new bytes(length);
        uint256 destPtr;
        assembly {
            destPtr := add(result, 0x20)
        }
        _copy(item.memPtr + offset, destPtr, length);
        return result;
    }

    function toUint(RLPItem memory item) internal pure returns (uint256) {
        bytes memory b = toBytes(item);
        if (b.length == 0) return 0;
        if (b.length > 32) revert InvalidRLP();
        uint256 result = 0;
        for (uint256 i = 0; i < b.length; i++) {
            result = (result << 8) | uint8(b[i]);
        }
        return result;
    }

    function toAddress(RLPItem memory item) internal pure returns (address) {
        bytes memory b = toBytes(item);
        if (b.length != 20) revert InvalidRLP();
        address addr;
        assembly {
            addr := div(mload(add(b, 0x20)), 0x1000000000000000000000000)
        }
        return addr;
    }

    function toBytes32(RLPItem memory item) internal pure returns (bytes32) {
        bytes memory b = toBytes(item);
        if (b.length != 32) revert InvalidRLP();
        bytes32 res;
        assembly {
            res := mload(add(b, 0x20))
        }
        return res;
    }

    function toRawBytes(RLPItem memory item) internal pure returns (bytes memory) {
        bytes memory result = new bytes(item.len);
        uint256 destPtr;
        assembly {
            destPtr := add(result, 0x20)
        }
        _copy(item.memPtr, destPtr, item.len);
        return result;
    }

    function _payloadOffset(uint256 memPtr)
        private
        pure
        returns (uint256 offset, uint256 length)
    {
        uint8 byte0;
        assembly {
            byte0 := byte(0, mload(memPtr))
        }
        if (byte0 < STRING_SHORT_START) {
            return (0, 1);
        } else if (byte0 < STRING_LONG_START) {
            return (1, byte0 - STRING_SHORT_START);
        } else if (byte0 < LIST_SHORT_START) {
            uint256 byteLen = byte0 - STRING_LONG_START + 1;
            uint256 payloadLen = _readUint(memPtr + 1, byteLen);
            return (1 + byteLen, payloadLen);
        } else if (byte0 < LIST_LONG_START) {
            return (1, byte0 - LIST_SHORT_START);
        } else {
            uint256 byteLen = byte0 - LIST_LONG_START + 1;
            uint256 payloadLen = _readUint(memPtr + 1, byteLen);
            return (1 + byteLen, payloadLen);
        }
    }

    function _itemLength(uint256 memPtr) private pure returns (uint256) {
        uint8 byte0;
        assembly {
            byte0 := byte(0, mload(memPtr))
        }
        if (byte0 < STRING_SHORT_START) {
            return 1;
        } else if (byte0 < STRING_LONG_START) {
            return 1 + (byte0 - STRING_SHORT_START);
        } else if (byte0 < LIST_SHORT_START) {
            uint256 byteLen = byte0 - STRING_LONG_START + 1;
            return 1 + byteLen + _readUint(memPtr + 1, byteLen);
        } else if (byte0 < LIST_LONG_START) {
            return 1 + (byte0 - LIST_SHORT_START);
        } else {
            uint256 byteLen = byte0 - LIST_LONG_START + 1;
            return 1 + byteLen + _readUint(memPtr + 1, byteLen);
        }
    }

    function _readUint(uint256 memPtr, uint256 len) private pure returns (uint256) {
        uint256 result = 0;
        for (uint256 i = 0; i < len; i++) {
            uint8 b;
            assembly {
                b := byte(0, mload(add(memPtr, i)))
            }
            result = (result << 8) | b;
        }
        return result;
    }

    function _copy(
        uint256 src,
        uint256 dest,
        uint256 len
    ) private pure {
        assembly {
            for { } gt(len, 31) {
                src := add(src, 32)
                dest := add(dest, 32)
                len := sub(len, 32)
            } {
                mstore(dest, mload(src))
            }
            if gt(len, 0) {
                let mask := sub(exp(256, sub(32, len)), 1)
                let srcVal := and(mload(src), not(mask))
                let destVal := and(mload(dest), mask)
                mstore(dest, or(srcVal, destVal))
            }
        }
    }
}
