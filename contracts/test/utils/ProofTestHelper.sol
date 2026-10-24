// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SourceBridge} from "../../src/SourceBridge.sol";

contract ProofTestHelper {
    bytes32 public constant MESSAGE_DISPATCHED_TOPIC =
        keccak256("MessageDispatched(bytes32,uint256,uint256,address,address,uint256,bytes,bytes32)");

    function buildReceiptRlp(
        address sourceContract,
        bytes32 messageId,
        uint256 sourceChainId,
        uint256 destinationChainId,
        address destinationReceiver,
        uint256 nonce,
        bytes memory payload,
        bytes32 payloadHash,
        uint256 status
    ) public pure returns (bytes memory) {
        // Encode log data: (sourceContract, destinationReceiver, nonce, payload, payloadHash)
        bytes memory logData = abi.encode(
            sourceContract,
            destinationReceiver,
            nonce,
            payload,
            payloadHash
        );

        // Build log topics list: [topic0, topic1, topic2, topic3]
        bytes memory topicsRlp = _encodeFourTopics(
            MESSAGE_DISPATCHED_TOPIC,
            messageId,
            bytes32(sourceChainId),
            bytes32(destinationChainId)
        );

        // Encode single Log: [address, topicsList, data]
        bytes memory logItemRlp = _encodeLogItem(sourceContract, topicsRlp, logData);

        // Encode logs list: [logItem]
        bytes memory logsListRlp = _encodeList(logItemRlp);

        // Dummy bloom filter of 256 zero bytes
        bytes memory bloomRlp = _encodeBloom();

        // Encode receipt: [status, cumulativeGasUsed, bloom, logsList]
        bytes memory receiptItems = abi.encodePacked(
            _encodeUint(status),
            _encodeUint(50000), // cumulative gas used
            bloomRlp,
            logsListRlp
        );

        return _encodeList(receiptItems);
    }

    function buildSingleNodeMPTProof(bytes memory receiptValue)
        public
        pure
        returns (bytes32 receiptsRoot, bytes[] memory mptProof)
    {
        // For txIndex = 0: key is 0x80 -> nibbles 0x08, 0x00
        // Compact path for even leaf: 0x2080
        bytes memory compactPath = hex"2080";
        bytes memory leafNode = _encodeTwoItemList(compactPath, receiptValue);

        receiptsRoot = keccak256(leafNode);
        mptProof = new bytes[](1);
        mptProof[0] = leafNode;
    }

    function _encodeTwoItemList(bytes memory item1, bytes memory item2)
        internal
        pure
        returns (bytes memory)
    {
        bytes memory rlp1 = _encodeBytes(item1);
        bytes memory rlp2 = _encodeBytes(item2);
        return _encodeList(abi.encodePacked(rlp1, rlp2));
    }

    function _encodeBytes(bytes memory b) internal pure returns (bytes memory) {
        if (b.length == 1 && uint8(b[0]) < 0x80) {
            return b;
        } else if (b.length <= 55) {
            return abi.encodePacked(bytes1(uint8(0x80 + b.length)), b);
        } else {
            bytes memory lenBytes = _toMinimalBytes(b.length);
            return abi.encodePacked(bytes1(uint8(0xb7 + lenBytes.length)), lenBytes, b);
        }
    }

    function _encodeUint(uint256 val) internal pure returns (bytes memory) {
        if (val == 0) {
            return hex"80";
        } else if (val < 128) {
            return abi.encodePacked(bytes1(uint8(val)));
        } else {
            bytes memory b = _toMinimalBytes(val);
            return abi.encodePacked(bytes1(uint8(0x80 + b.length)), b);
        }
    }

    function _encodeList(bytes memory payload) internal pure returns (bytes memory) {
        if (payload.length <= 55) {
            return abi.encodePacked(bytes1(uint8(0xc0 + payload.length)), payload);
        } else {
            bytes memory lenBytes = _toMinimalBytes(payload.length);
            return abi.encodePacked(bytes1(uint8(0xf7 + lenBytes.length)), lenBytes, payload);
        }
    }

    function _encodeFourTopics(
        bytes32 t0,
        bytes32 t1,
        bytes32 t2,
        bytes32 t3
    ) internal pure returns (bytes memory) {
        bytes memory encoded = abi.encodePacked(
            _encodeBytes(abi.encodePacked(t0)),
            _encodeBytes(abi.encodePacked(t1)),
            _encodeBytes(abi.encodePacked(t2)),
            _encodeBytes(abi.encodePacked(t3))
        );
        return _encodeList(encoded);
    }

    function _encodeLogItem(
        address emitter,
        bytes memory topicsRlp,
        bytes memory data
    ) internal pure returns (bytes memory) {
        bytes memory addrRlp = _encodeBytes(abi.encodePacked(emitter));
        bytes memory dataRlp = _encodeBytes(data);
        return _encodeList(abi.encodePacked(addrRlp, topicsRlp, dataRlp));
    }

    function _encodeBloom() internal pure returns (bytes memory) {
        bytes memory zeros = new bytes(256);
        bytes memory lenBytes = _toMinimalBytes(256); // 2 bytes: 0x01, 0x00
        return abi.encodePacked(bytes1(uint8(0xb7 + lenBytes.length)), lenBytes, zeros);
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
