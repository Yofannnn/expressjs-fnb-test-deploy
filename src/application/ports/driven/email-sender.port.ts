import { OrderItemPlainObject } from "@/application/types/order.type";
import { DeliveryType } from "@/domain/types/order.type";

export interface Recipient {
  address: string;
  name?: string;
}

export interface VerificationEmailData {
  token: string;
  expiresAt: Date;
  userName?: string;
  isResend: boolean;
}

export interface EmailVerifiedData {
  verifiedAt: Date;
  hasCompletedProfile: boolean;
  welcomeOffer?: string; // e.g., "Get 10% off your first order with code WELCOME10"
  nextSteps?: Array<{
    title: string;
    description: string;
    url?: string;
  }>;
}

export interface PasswordResetData {
  token: string;
  expiresAt: Date;
  requestedAt: Date;
  requestIpAddress?: string;
  requestDevice?: string;
  requestLocation?: string;
}

export interface PasswordChangedData {
  dateTime: Date;
  location?: string;
  ipAddress?: string;
  device?: string;
  wasYou?: boolean;
  previousLoginDate?: Date;
}

export interface AccountLockedData {
  lockedUntil: Date;
  reason: "multiple_failed_attempts" | "suspicious_activity" | "admin_action";
  unlockInstructions?: string;
}

export interface GuestOrderTokenReissuedData {
  orderId: string;
  guestToken: string;
  expiresAt: Date;
}

interface OnlineOrderCreatedBaseData {
  orderId: string;
  items: OrderItemPlainObject[];
  subtotal: number;
  deliveryFee?: number;
  tax: number;
  serviceCharge: number;
  total: number;
  deliveryType: DeliveryType;
  deliveryAddress?: string;
  scheduledAt?: Date;
}

export type OnlineOrderCreatedData =
  | (OnlineOrderCreatedBaseData & { isGuest: true; guestToken: string })
  | (OnlineOrderCreatedBaseData & { isGuest: false; loyaltyPointsEarned?: number });

export interface EmailSenderPort {
  sendVerificationEmail(recipient: Recipient, data: VerificationEmailData): Promise<void>;
  sendEmailVerified(recipient: Recipient, data: EmailVerifiedData): Promise<void>;
  sendAccountLocked(recipient: Recipient, data: AccountLockedData): Promise<void>;
  sendPasswordReset(recipient: Recipient, data: PasswordResetData): Promise<void>;
  sendPasswordChanged(recipient: Recipient, data: PasswordChangedData): Promise<void>;
  sendOnlineOrderCreated(recipient: Recipient, data: OnlineOrderCreatedData): Promise<void>;
  sendGuestOrderTokenReissued(recipient: Recipient, data: GuestOrderTokenReissuedData): Promise<void>;
}
