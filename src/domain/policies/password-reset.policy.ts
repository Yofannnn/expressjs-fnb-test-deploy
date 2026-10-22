export interface PasswordResetPolicy {
  resendCooldownInSeconds: number;
  expiryInMinutes: number;
  gracePeriodMs: number;
  maxResendAttemptsPerHour: number;
}
