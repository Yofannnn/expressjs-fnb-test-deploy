export interface VerificationEmailPolicy {
  expiryInHours: number;
  resendCooldownInSeconds: number;
  maxResendAttemptsPerHour: number;
}
