export const SourceBridgeAbi = [
  {
    type: 'event',
    name: 'MessageDispatched',
    inputs: [
      { name: 'messageId', type: 'bytes32', indexed: true },
      { name: 'sourceChainId', type: 'uint256', indexed: true },
      { name: 'destinationChainId', type: 'uint256', indexed: true },
      { name: 'sourceContract', type: 'address', indexed: false },
      { name: 'destinationReceiver', type: 'address', indexed: false },
      { name: 'nonce', type: 'uint256', indexed: false },
      { name: 'payload', type: 'bytes', indexed: false },
      { name: 'payloadHash', type: 'bytes32', indexed: false }
    ]
  },
  {
    type: 'function',
    name: 'dispatchMessage',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'destinationChainId', type: 'uint256' },
      { name: 'destinationReceiver', type: 'address' },
      { name: 'payload', type: 'bytes' }
    ],
    outputs: [
      { name: 'messageId', type: 'bytes32' },
      { name: 'nonce', type: 'uint256' }
    ]
  },
  {
    type: 'function',
    name: 'computeMessageId',
    stateMutability: 'pure',
    inputs: [
      { name: 'sourceChainId', type: 'uint256' },
      { name: 'sourceContract', type: 'address' },
      { name: 'destinationChainId', type: 'uint256' },
      { name: 'destinationReceiver', type: 'address' },
      { name: 'nonce', type: 'uint256' },
      { name: 'payloadHash', type: 'bytes32' }
    ],
    outputs: [{ name: '', type: 'bytes32' }]
  },
  {
    type: 'function',
    name: 'nonceCounter',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const;

export const DestinationVerifierAbi = [
  {
    type: 'event',
    name: 'MessageVerified',
    inputs: [
      { name: 'messageId', type: 'bytes32', indexed: true },
      { name: 'sourceChainId', type: 'uint256', indexed: true },
      { name: 'sourceContract', type: 'address', indexed: true },
      { name: 'destinationReceiver', type: 'address', indexed: false },
      { name: 'nonce', type: 'uint256', indexed: false },
      { name: 'blockNumber', type: 'uint256', indexed: false },
      { name: 'txIndex', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'MessageExecuted',
    inputs: [
      { name: 'messageId', type: 'bytes32', indexed: true },
      { name: 'destinationReceiver', type: 'address', indexed: true },
      { name: 'success', type: 'bool', indexed: false }
    ]
  },
  {
    type: 'function',
    name: 'verifyAndExecute',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'proof',
        type: 'tuple',
        components: [
          { name: 'sourceChainId', type: 'uint256' },
          { name: 'sourceContract', type: 'address' },
          { name: 'blockNumber', type: 'uint256' },
          { name: 'blockHash', type: 'bytes32' },
          { name: 'receiptsRoot', type: 'bytes32' },
          { name: 'txIndex', type: 'uint256' },
          { name: 'receiptRlp', type: 'bytes' },
          { name: 'mptProof', type: 'bytes[]' },
          { name: 'payload', type: 'bytes' }
        ]
      },
      { name: 'headerProof', type: 'bytes' }
    ],
    outputs: [{ name: 'messageId', type: 'bytes32' }]
  },
  {
    type: 'function',
    name: 'isMessageProcessed',
    stateMutability: 'view',
    inputs: [{ name: 'messageId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'getVerificationRecord',
    stateMutability: 'view',
    inputs: [{ name: 'messageId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'messageId', type: 'bytes32' },
          { name: 'sourceChainId', type: 'uint256' },
          { name: 'sourceContract', type: 'address' },
          { name: 'destinationReceiver', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'payloadHash', type: 'bytes32' },
          { name: 'blockNumber', type: 'uint256' },
          { name: 'txIndex', type: 'uint256' },
          { name: 'verifiedAt', type: 'uint256' },
          { name: 'executed', type: 'bool' }
        ]
      }
    ]
  },
  {
    type: 'function',
    name: 'setSourceBridge',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'sourceChainId', type: 'uint256' },
      { name: 'sourceBridge', type: 'address' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'headerVerifier',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  }
] as const;

export const DevHeaderOracleAbi = [
  {
    type: 'event',
    name: 'HeaderCommitted',
    inputs: [
      { name: 'sourceChainId', type: 'uint256', indexed: true },
      { name: 'blockNumber', type: 'uint256', indexed: true },
      { name: 'blockHash', type: 'bytes32', indexed: true },
      { name: 'receiptsRoot', type: 'bytes32', indexed: false },
      { name: 'relayer', type: 'address', indexed: false }
    ]
  },
  {
    type: 'function',
    name: 'commitSourceHeader',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'sourceChainId', type: 'uint256' },
      { name: 'blockNumber', type: 'uint256' },
      { name: 'blockHash', type: 'bytes32' },
      { name: 'receiptsRoot', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'verifySourceHeader',
    stateMutability: 'view',
    inputs: [
      { name: 'sourceChainId', type: 'uint256' },
      { name: 'blockNumber', type: 'uint256' },
      { name: 'blockHash', type: 'bytes32' },
      { name: 'receiptsRoot', type: 'bytes32' },
      { name: 'headerProof', type: 'bytes' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'getTrustModel',
    stateMutability: 'pure',
    inputs: [],
    outputs: [{ name: '', type: 'string' }]
  }
] as const;

export const CrossProofReceiverAbi = [
  {
    type: 'function',
    name: 'expectedVerifier',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    type: 'event',
    name: 'ApplicationActionExecuted',
    inputs: [
      { name: 'messageId', type: 'bytes32', indexed: true },
      { name: 'sourceChainId', type: 'uint256', indexed: true },
      { name: 'sourceContract', type: 'address', indexed: true },
      { name: 'messageContent', type: 'string', indexed: false }
    ]
  },
  {
    type: 'function',
    name: 'totalMessagesReceived',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'lastProcessedMessageId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }]
  },
  {
    type: 'function',
    name: 'lastMessageContent',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }]
  }
] as const;
