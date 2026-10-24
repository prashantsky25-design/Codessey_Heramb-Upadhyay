import { VerificationRecord } from '@crossproof/shared';

class VerificationStore {
  private records: Map<string, VerificationRecord> = new Map();

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // Seed a labelled demo verification record for initial dashboard visibility
    const sampleRecord: VerificationRecord = {
      verificationId: 'v-seed-001',
      messageId: '0x8f2a41d9c73b0921e4f451b6c7a4529d8e41a9807532d665790432f815ac1e22',
      sourceChainId: 31337,
      sourceContract: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      destinationChainId: 31338,
      destinationReceiver: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
      sourceTxHash: '0x4a821e285a9bc811342657e841fa5cb2e33f381ad79383625f381b0163359d9f',
      destinationTxHash: '0x7c9802e3b8a1c974d64239841804e43217bca841b8a514d3f2b87431fa5bc821',
      blockNumber: 42,
      txIndex: 0,
      payload: '0x43726f737350726f6f663a2044656d6f2053656564205472616e73616374696f6e',
      payloadHash: '0x3a4b92b7c61f2518e692482e9871542f741298c4149952a84b14d87179042b51',
      verifiedAt: Math.floor(Date.now() / 1000) - 180,
      gasUsed: '241830',
      proofTimeMs: 42,
      status: 'VERIFIED',
      trustMode: 'MODE_A_LOCAL_ORACLE'
    };
    this.records.set(sampleRecord.verificationId, sampleRecord);
  }

  public save(record: VerificationRecord): VerificationRecord {
    this.records.set(record.verificationId, record);
    return record;
  }

  public get(verificationId: string): VerificationRecord | undefined {
    return this.records.get(verificationId);
  }

  public getByMessageId(messageId: string): VerificationRecord | undefined {
    return Array.from(this.records.values()).find(
      (r) => r.messageId.toLowerCase() === messageId.toLowerCase()
    );
  }

  public getBySourceTxHash(txHash: string): VerificationRecord | undefined {
    return Array.from(this.records.values()).find(
      (r) => r.sourceTxHash.toLowerCase() === txHash.toLowerCase()
    );
  }

  public list(filters?: {
    sourceChainId?: number;
    destinationChainId?: number;
    status?: string;
    search?: string;
  }): VerificationRecord[] {
    let result = Array.from(this.records.values());

    if (filters?.sourceChainId) {
      result = result.filter((r) => r.sourceChainId === filters.sourceChainId);
    }
    if (filters?.destinationChainId) {
      result = result.filter((r) => r.destinationChainId === filters.destinationChainId);
    }
    if (filters?.status) {
      result = result.filter((r) => r.status.toUpperCase() === filters.status?.toUpperCase());
    }
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.verificationId.toLowerCase().includes(s) ||
          r.sourceTxHash.toLowerCase().includes(s) ||
          r.messageId.toLowerCase().includes(s) ||
          r.destinationTxHash?.toLowerCase().includes(s)
      );
    }

    return result.sort((a, b) => b.verifiedAt - a.verifiedAt);
  }
}

export const verificationStore = new VerificationStore();
