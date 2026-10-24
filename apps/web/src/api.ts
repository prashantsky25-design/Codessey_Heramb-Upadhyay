import { ChainConfig, VerificationRecord, CrossChainProofData } from '@crossproof/shared';

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchChains(): Promise<{ status: string; chains: ChainConfig[] }> {
  const res = await fetch(`${API_BASE}/chains`);
  return res.json();
}

export async function fetchTransaction(chainId: number, txHash: string) {
  const res = await fetch(`${API_BASE}/transactions/${chainId}/${txHash}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to fetch transaction');
  }
  return res.json();
}

export async function prepareVerification(
  sourceChainId: number,
  txHash: string,
  destinationChainId?: number
) {
  const res = await fetch(`${API_BASE}/verification/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceChainId, txHash, destinationChainId })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Proof preparation failed');
  }
  return data;
}

export async function verifyProofLocally(
  sourceChainId: number,
  destinationChainId: number,
  sourceTxHash: string,
  proof: CrossChainProofData
) {
  const res = await fetch(`${API_BASE}/verification/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceChainId,
      destinationChainId,
      sourceTxHash,
      proof,
      headerProof: '0x'
    })
  });
  return res.json();
}

export async function submitVerification(
  sourceChainId: number,
  destinationChainId: number,
  sourceTxHash: string,
  proof: CrossChainProofData,
  simulateTamper: 'none' | 'proof_node' | 'payload' | 'replay' = 'none'
) {
  const res = await fetch(`${API_BASE}/verification/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceChainId,
      destinationChainId,
      sourceTxHash,
      proof,
      headerProof: '0x',
      simulateTamper
    })
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || 'Submission failed');
    (err as any).response = data;
    throw err;
  }
  return data;
}

export async function fetchVerificationHistory(filters?: {
  sourceChainId?: number;
  destinationChainId?: number;
  status?: string;
  search?: string;
}): Promise<{ status: string; count: number; records: VerificationRecord[] }> {
  const params = new URLSearchParams();
  if (filters?.sourceChainId) params.set('sourceChainId', String(filters.sourceChainId));
  if (filters?.destinationChainId) params.set('destinationChainId', String(filters.destinationChainId));
  if (filters?.status && filters.status !== 'ALL') params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);

  const res = await fetch(`${API_BASE}/verification/history?${params.toString()}`);
  return res.json();
}

export async function fetchVerificationRecord(verificationId: string): Promise<{ status: string; record: VerificationRecord }> {
  const res = await fetch(`${API_BASE}/verification/${verificationId}`);
  if (!res.ok) {
    throw new Error('Verification record not found');
  }
  return res.json();
}

export async function runAttack(
  type: 'tamper-proof' | 'replay' | 'substitute-payload' | 'wrong-chain' | 'missing-finality',
  destinationChainId: number,
  proof: CrossChainProofData
) {
  const res = await fetch(`${API_BASE}/attack/${type}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destinationChainId, proof })
  });
  return res.json();
}

export async function generateTestTransaction(
  sourceChainId: number = 31337,
  destinationChainId: number = 31338,
  payload?: string
): Promise<{
  status: string;
  transaction: {
    hash: string;
    chainId: number;
    blockNumber: number;
    blockHash: string;
    transactionIndex: number;
    status: string;
    messageId: string | null;
    payload: string;
    destinationChainId: number;
  };
}> {
  const res = await fetch(`${API_BASE}/transactions/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceChainId, destinationChainId, payload })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to generate test transaction');
  }
  return data;
}
