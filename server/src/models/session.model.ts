export interface SessionModel {
  id: string;
  userId: string;
  tokenHash: string;
  ipHash?: string;
  userAgentHash?: string;
  expiresAt: string;
  createdAt: string;
}
