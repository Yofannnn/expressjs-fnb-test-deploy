import { InvalidExpirationDateException, InvalidExpirationDurationException } from "../exceptions/expiration.exceptions";

export class Expiration {
  constructor(private readonly expiresAt: Date) {
    if (!expiresAt || isNaN(expiresAt.getTime())) {
      throw new InvalidExpirationDateException(expiresAt);
    }
  }

  isExpired(): boolean {
    return Date.now() > this.expiresAt.getTime();
  }

  isExpiredAt(checkTime: Date): boolean {
    return checkTime.getTime() > this.expiresAt.getTime();
  }

  getExpiresAt(): Date {
    return new Date(this.expiresAt);
  }

  getRemainingTimeMs(): number {
    const remaining = this.expiresAt.getTime() - Date.now();
    return Math.max(0, remaining);
  }

  willExpireWithin(durationMs: number): boolean {
    return this.getRemainingTimeMs() <= durationMs;
  }

  equals(other: Expiration): boolean {
    return this.expiresAt.getTime() === other.expiresAt.getTime();
  }

  static immediate(): Expiration {
    return new Expiration(new Date(Date.now() - 1));
  }

  static fromDuration(durationMs: number): Expiration {
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      throw new InvalidExpirationDurationException("milliseconds", durationMs);
    }
    return new Expiration(new Date(Date.now() + durationMs));
  }

  static days(days: number): Expiration {
    if (!Number.isFinite(days) || days <= 0) {
      throw new InvalidExpirationDurationException("days", days);
    }
    return Expiration.fromDuration(days * 24 * 60 * 60 * 1000);
  }

  static hours(hours: number): Expiration {
    if (!Number.isFinite(hours) || hours <= 0) {
      throw new InvalidExpirationDurationException("hours", hours);
    }
    return Expiration.fromDuration(hours * 60 * 60 * 1000);
  }

  static minutes(minutes: number): Expiration {
    if (!Number.isFinite(minutes) || minutes <= 0) {
      throw new InvalidExpirationDurationException("minutes", minutes);
    }
    return Expiration.fromDuration(minutes * 60 * 1000);
  }
}
