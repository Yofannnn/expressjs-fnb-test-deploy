export interface SessionCreationData {
  id: string;
  tokenFingerprint: string;
  tokenFamily: string;
  userId: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
  deviceId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SessionRebuildData {
  id: string;
  tokenFingerprint: string;
  tokenFamily: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  revokeReason: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  deviceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
