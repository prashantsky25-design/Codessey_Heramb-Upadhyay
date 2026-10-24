import { VerificationRecord } from '@crossproof/shared';

class VerificationStore {
  private records: Map<string, VerificationRecord> = new Map();

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
