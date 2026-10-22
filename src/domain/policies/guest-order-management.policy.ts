export interface GuestOrderManagementPolicy {
  tokenExpiryInHours: number;
  resendCooldownInSeconds: number;
  maxResendAttemptsPerHour: number;
}
