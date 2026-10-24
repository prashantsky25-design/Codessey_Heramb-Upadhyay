import { CrossChainProofData } from '@crossproof/shared';

export interface ActiveVerification {
  proof: CrossChainProofData;
  sourceChainId: number;
  destinationChainId: number;
  verificationId?: string;
  messageId?: string;
  destinationTxHash?: string;
}
