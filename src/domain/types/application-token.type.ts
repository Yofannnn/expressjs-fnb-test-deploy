export enum ApplicationTokenType {
  VERIFICATION_EMAIL = "VERIFICATION_EMAIL",
  PASSWORD_RESET = "PASSWORD_RESET",
  GUEST_ORDER_MANAGEMENT = "GUEST_ORDER_MANAGEMENT",
}

export interface BaseApplicationTokenCreationData {
  id: string;
  rawToken: string;
  tokenFingerprint: string;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BaseApplicationTokenRebuildData {
  id: string;
  tokenFingerprint: string;
  type: ApplicationTokenType;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationEmailTokenCreationData extends BaseApplicationTokenCreationData {
  userId: string;
  identifier: string;
}

export interface VerificationEmailTokenRebuildData extends BaseApplicationTokenRebuildData {
  userId: string;
  identifier: string;
}

export interface VerificationEmailTokenMetadata {
  type: ApplicationTokenType;
  tokenId: string;
  userId: string;
  identifier: string;
}

export interface PasswordResetTokenCreationData extends BaseApplicationTokenCreationData {
  userId: string;
  identifier: string;
}

export interface PasswordResetTokenRebuildData extends BaseApplicationTokenRebuildData {
  userId: string;
  identifier: string;
}

export interface PasswordResetTokenMetadata {
  type: ApplicationTokenType;
  tokenId: string;
  userId: string;
  identifier: string;
}

export interface GuestOrderManagementTokenCreationData extends BaseApplicationTokenCreationData {
  identifier: string;
  orderId: string;
}

export interface GuestOrderManagementTokenRebuildData {
  id: string;
  tokenFingerprint: string;
  identifier: string;
  orderId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GuestOrderManagementTokenMetadata {
  type: ApplicationTokenType;
  tokenId: string;
  orderId: string;
  identifier: string;
}

export type ApplicationTokenMetadata = VerificationEmailTokenMetadata | PasswordResetTokenMetadata | GuestOrderManagementTokenMetadata;
