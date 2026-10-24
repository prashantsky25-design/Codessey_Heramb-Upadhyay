import { RLP } from '@ethereumjs/rlp';
import { hexToBytes, toHex, TransactionReceipt } from 'viem';

/**
 * Encodes transaction index to RLP as specified by Ethereum receipts trie key
 */
export function encodeTxIndexToRlp(txIndex: number): Uint8Array {
  if (txIndex === 0) {
    return new Uint8Array([0x80]);
  }
  return RLP.encode(txIndex);
}

/**
 * Encodes a Viem TransactionReceipt into its canonical Ethereum RLP representation
 */
export function encodeReceiptToRlp(receipt: TransactionReceipt): Uint8Array {
  const statusNum = receipt.status === 'success' ? 1 : 0;
  const statusBytes = statusNum === 0 ? new Uint8Array([]) : new Uint8Array([statusNum]);

  const cumulativeGasUsedBytes =
    receipt.cumulativeGasUsed === 0n
      ? new Uint8Array([])
      : hexToBytes(toHex(receipt.cumulativeGasUsed));

  const logsBloomBytes = hexToBytes(receipt.logsBloom || `0x${'00'.repeat(256)}`);

  // Format logs: [address, [topics...], data]
  const formattedLogs = receipt.logs.map((log) => {
    const addressBytes = hexToBytes(log.address);
    const topicsBytes = log.topics.map((t) => hexToBytes(t));
    const dataBytes = hexToBytes(log.data || '0x');
    return [addressBytes, topicsBytes, dataBytes];
  });

  const receiptFields = [
    statusBytes,
    cumulativeGasUsedBytes,
    logsBloomBytes,
    formattedLogs
  ];

  const payloadRlp = RLP.encode(receiptFields);

  // If typed transaction (EIP-1559 = 'eip1559', EIP-2930 = 'eip2930')
  if (receipt.type === 'eip1559') {
    const prefixed = new Uint8Array(payloadRlp.length + 1);
    prefixed[0] = 0x02; // Type 2 prefix
    prefixed.set(payloadRlp, 1);
    return prefixed;
  } else if (receipt.type === 'eip2930') {
    const prefixed = new Uint8Array(payloadRlp.length + 1);
    prefixed[0] = 0x01; // Type 1 prefix
    prefixed.set(payloadRlp, 1);
    return prefixed;
  }

  // Legacy (type 0)
  return payloadRlp;
}
