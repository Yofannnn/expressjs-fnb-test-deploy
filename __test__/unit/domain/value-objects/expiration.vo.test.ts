import { Expiration } from "@/domain/value-objects/expiration.vo";
import { InvalidExpirationDateException, InvalidExpirationDurationException } from "@/domain/exceptions/expiration.exceptions";

describe("Expiration", () => {
  const mockNow = new Date("2023-01-01T12:00:00.000Z");

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockNow);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create instance with valid date", () => {
      const futureDate = new Date(mockNow.getTime() + 3600000);
      const expiration = new Expiration(futureDate);

      expect(expiration).toBeInstanceOf(Expiration);
    });

    it("should throw InvalidExpirationDateException for null date", () => {
      expect(() => new Expiration(null as unknown as Date)).toThrow(InvalidExpirationDateException);
    });

    it("should throw InvalidExpirationDateException for undefined date", () => {
      expect(() => new Expiration(undefined as unknown as Date)).toThrow(InvalidExpirationDateException);
    });

    it("should throw InvalidExpirationDateException for invalid date", () => {
      expect(() => new Expiration(new Date("invalid"))).toThrow(InvalidExpirationDateException);
    });

    it("should include received value in exception details", () => {
      const invalidDate = new Date("invalid");

      try {
        new Expiration(invalidDate);
      } catch (error) {
        expect((error as InvalidExpirationDateException).details).toEqual({ received: invalidDate });
      }
    });
  });

  describe("isExpired", () => {
    it("should return false for future date", () => {
      const futureDate = new Date(mockNow.getTime() + 3600000);
      const expiration = new Expiration(futureDate);

      expect(expiration.isExpired()).toBe(false);
    });

    it("should return true for past date", () => {
      const pastDate = new Date(mockNow.getTime() - 3600000);
      const expiration = new Expiration(pastDate);

      expect(expiration.isExpired()).toBe(true);
    });

    it("should return false for current time (equal times are not expired)", () => {
      const currentDate = new Date(mockNow.getTime());
      const expiration = new Expiration(currentDate);

      expect(expiration.isExpired()).toBe(false);
    });

    it("should return true for date 1ms in the past", () => {
      const justPastDate = new Date(mockNow.getTime() - 1);
      const expiration = new Expiration(justPastDate);

      expect(expiration.isExpired()).toBe(true);
    });
  });

  describe("isExpiredAt", () => {
    it("should return false when check time is before expiration", () => {
      const expirationDate = new Date(mockNow.getTime() + 7200000);
      const checkTime = new Date(mockNow.getTime() + 3600000);
      const expiration = new Expiration(expirationDate);

      expect(expiration.isExpiredAt(checkTime)).toBe(false);
    });

    it("should return true when check time is after expiration", () => {
      const expirationDate = new Date(mockNow.getTime() + 3600000);
      const checkTime = new Date(mockNow.getTime() + 7200000);
      const expiration = new Expiration(expirationDate);

      expect(expiration.isExpiredAt(checkTime)).toBe(true);
    });

    it("should return false when check time equals expiration (equal times are not expired)", () => {
      const expirationDate = new Date(mockNow.getTime() + 3600000);
      const checkTime = new Date(expirationDate.getTime());
      const expiration = new Expiration(expirationDate);

      expect(expiration.isExpiredAt(checkTime)).toBe(false);
    });

    it("should return true when check time is 1ms after expiration", () => {
      const expirationDate = new Date(mockNow.getTime() + 3600000);
      const checkTime = new Date(expirationDate.getTime() + 1);
      const expiration = new Expiration(expirationDate);

      expect(expiration.isExpiredAt(checkTime)).toBe(true);
    });
  });

  describe("getExpiresAt", () => {
    it("should return a new Date instance with same value", () => {
      const originalDate = new Date(mockNow.getTime() + 3600000);
      const expiration = new Expiration(originalDate);
      const returnedDate = expiration.getExpiresAt();

      expect(returnedDate).toEqual(originalDate);
      expect(returnedDate).not.toBe(originalDate);
    });
  });

  describe("getRemainingTimeMs", () => {
    it("should return positive value for future date", () => {
      const futureDate = new Date(mockNow.getTime() + 3600000);
      const expiration = new Expiration(futureDate);

      expect(expiration.getRemainingTimeMs()).toBe(3600000);
    });

    it("should return 0 for past date", () => {
      const pastDate = new Date(mockNow.getTime() - 3600000);
      const expiration = new Expiration(pastDate);

      expect(expiration.getRemainingTimeMs()).toBe(0);
    });

    it("should return 0 for current time", () => {
      const currentDate = new Date(mockNow.getTime());
      const expiration = new Expiration(currentDate);

      expect(expiration.getRemainingTimeMs()).toBe(0);
    });
  });

  describe("willExpireWithin", () => {
    it("should return true when remaining time is less than or equal to duration", () => {
      const expirationDate = new Date(mockNow.getTime() + 5000);
      const expiration = new Expiration(expirationDate);

      expect(expiration.willExpireWithin(10000)).toBe(true);
      expect(expiration.willExpireWithin(5000)).toBe(true);
    });

    it("should return false when remaining time is greater than duration", () => {
      const expirationDate = new Date(mockNow.getTime() + 15000);
      const expiration = new Expiration(expirationDate);

      expect(expiration.willExpireWithin(10000)).toBe(false);
    });

    it("should return true for expired token with any duration", () => {
      const pastDate = new Date(mockNow.getTime() - 3600000);
      const expiration = new Expiration(pastDate);

      expect(expiration.willExpireWithin(100000)).toBe(true);
    });
  });

  describe("equals", () => {
    it("should return true for same expiration time", () => {
      const date1 = new Date(mockNow.getTime() + 3600000);
      const date2 = new Date(mockNow.getTime() + 3600000);
      const expiration1 = new Expiration(date1);
      const expiration2 = new Expiration(date2);

      expect(expiration1.equals(expiration2)).toBe(true);
    });

    it("should return false for different expiration times", () => {
      const date1 = new Date(mockNow.getTime() + 3600000);
      const date2 = new Date(mockNow.getTime() + 7200000);
      const expiration1 = new Expiration(date1);
      const expiration2 = new Expiration(date2);

      expect(expiration1.equals(expiration2)).toBe(false);
    });
  });

  describe("static immediate", () => {
    it("should create expired expiration", () => {
      const expiration = Expiration.immediate();

      expect(expiration.isExpired()).toBe(true);
      expect(expiration.getRemainingTimeMs()).toBe(0);
    });
  });

  describe("static fromDuration", () => {
    it("should create expiration with correct future date", () => {
      const durationMs = 3600000;
      const expiration = Expiration.fromDuration(durationMs);

      const expectedDate = new Date(mockNow.getTime() + durationMs);
      expect(expiration.getExpiresAt().getTime()).toBe(expectedDate.getTime());
      expect(expiration.isExpired()).toBe(false);
    });

    it("should throw InvalidExpirationDurationException for negative duration", () => {
      expect(() => Expiration.fromDuration(-1000)).toThrow(InvalidExpirationDurationException);
    });

    it("should throw InvalidExpirationDurationException for zero duration", () => {
      expect(() => Expiration.fromDuration(0)).toThrow(InvalidExpirationDurationException);
    });

    it("should throw InvalidExpirationDurationException for NaN duration", () => {
      expect(() => Expiration.fromDuration(NaN)).toThrow(InvalidExpirationDurationException);
    });

    it("should throw InvalidExpirationDurationException for Infinity duration", () => {
      expect(() => Expiration.fromDuration(Infinity)).toThrow(InvalidExpirationDurationException);
    });

    it("should include duration type and value in exception details", () => {
      try {
        Expiration.fromDuration(-1000);
      } catch (error) {
        expect((error as InvalidExpirationDurationException).message).toContain("milliseconds");
        expect((error as InvalidExpirationDurationException).details).toEqual({ received: -1000, unit: "milliseconds" });
      }
    });
  });

  describe("static days", () => {
    it("should create expiration with correct number of days", () => {
      const days = 2;
      const expiration = Expiration.days(days);

      const expectedMs = days * 24 * 60 * 60 * 1000;
      const expectedDate = new Date(mockNow.getTime() + expectedMs);

      expect(expiration.getExpiresAt().getTime()).toBe(expectedDate.getTime());
    });

    it("should throw for invalid days", () => {
      expect(() => Expiration.days(-1)).toThrow(InvalidExpirationDurationException);
      expect(() => Expiration.days(0)).toThrow(InvalidExpirationDurationException);
      expect(() => Expiration.days(NaN)).toThrow(InvalidExpirationDurationException);
    });

    it("should include duration type and value in exception details", () => {
      try {
        Expiration.days(-1);
      } catch (error) {
        expect((error as InvalidExpirationDurationException).message).toContain("days");
        expect((error as InvalidExpirationDurationException).details).toEqual({ received: -1, unit: "days" });
      }
    });
  });

  describe("static hours", () => {
    it("should create expiration with correct number of hours", () => {
      const hours = 3;
      const expiration = Expiration.hours(hours);

      const expectedMs = hours * 60 * 60 * 1000;
      const expectedDate = new Date(mockNow.getTime() + expectedMs);

      expect(expiration.getExpiresAt().getTime()).toBe(expectedDate.getTime());
    });

    it("should throw for invalid hours", () => {
      expect(() => Expiration.hours(-1)).toThrow(InvalidExpirationDurationException);
      expect(() => Expiration.hours(0)).toThrow(InvalidExpirationDurationException);
    });

    it("should include duration type and value in exception details", () => {
      try {
        Expiration.hours(-1);
      } catch (error) {
        expect((error as InvalidExpirationDurationException).message).toContain("hours");
        expect((error as InvalidExpirationDurationException).details).toEqual({ received: -1, unit: "hours" });
      }
    });
  });

  describe("static minutes", () => {
    it("should create expiration with correct number of minutes", () => {
      const minutes = 30;
      const expiration = Expiration.minutes(minutes);

      const expectedMs = minutes * 60 * 1000;
      const expectedDate = new Date(mockNow.getTime() + expectedMs);

      expect(expiration.getExpiresAt().getTime()).toBe(expectedDate.getTime());
    });

    it("should throw for invalid minutes", () => {
      expect(() => Expiration.minutes(-1)).toThrow(InvalidExpirationDurationException);
      expect(() => Expiration.minutes(0)).toThrow(InvalidExpirationDurationException);
    });

    it("should include duration type and value in exception details", () => {
      try {
        Expiration.minutes(-1);
      } catch (error) {
        expect((error as InvalidExpirationDurationException).message).toContain("minutes");
        expect((error as InvalidExpirationDurationException).details).toEqual({ received: -1, unit: "minutes" });
      }
    });
  });

  describe("edge cases", () => {
    it("should expire after duration has passed", () => {
      const duration = 1;
      const expiration = Expiration.fromDuration(duration);
      const expirationTime = expiration.getExpiresAt().getTime();

      expect(expiration.isExpired()).toBe(false);
      expect(Date.now()).toBeLessThan(expirationTime);

      jest.advanceTimersByTime(duration);

      expect(expiration.isExpired()).toBe(false);
      expect(Date.now()).toBe(expirationTime);

      jest.advanceTimersByTime(1);

      expect(expiration.isExpired()).toBe(true);
      expect(Date.now()).toBeGreaterThan(expirationTime);
    });

    it("should handle expiration exactly at current time", () => {
      expect(() => Expiration.fromDuration(0)).toThrow(InvalidExpirationDurationException);
    });

    it("should handle expiration with 1ms remaining", () => {
      const expiration = Expiration.fromDuration(1);

      expect(expiration.isExpired()).toBe(false);
      expect(expiration.getRemainingTimeMs()).toBe(1);
      expect(expiration.willExpireWithin(1)).toBe(true);
      expect(expiration.willExpireWithin(2)).toBe(true);
    });

    it("should handle very large durations", () => {
      const largeDuration = 100 * 365 * 24 * 60 * 60 * 1000;
      const expiration = Expiration.fromDuration(largeDuration);

      expect(expiration.isExpired()).toBe(false);
      expect(expiration.getRemainingTimeMs()).toBeGreaterThan(0);
    });

    it("should return new Date instances to prevent mutation", () => {
      const originalDate = new Date(mockNow.getTime() + 3600000);
      const expiration = new Expiration(originalDate);

      const returnedDate1 = expiration.getExpiresAt();
      const returnedDate2 = expiration.getExpiresAt();

      expect(returnedDate1).toEqual(returnedDate2);
      expect(returnedDate1).not.toBe(returnedDate2);

      returnedDate1.setTime(0);
      expect(expiration.getExpiresAt().getTime()).toBe(originalDate.getTime());
    });
  });

  describe("boundary conditions", () => {
    it("should consider token NOT expired when check time equals expiration time", () => {
      const expirationDate = new Date(mockNow.getTime() + 5000);
      const checkTime = new Date(expirationDate.getTime());
      const expiration = new Expiration(expirationDate);
      expect(expiration.isExpiredAt(checkTime)).toBe(false);
    });

    it("should handle immediate expiration", () => {
      const expiration = Expiration.immediate();

      expect(expiration.isExpired()).toBe(true);
      expect(expiration.getRemainingTimeMs()).toBe(0);
    });
  });

  describe("comparison logic", () => {
    it("should use strict greater-than comparison", () => {
      const now = Date.now();
      const expiration = new Expiration(new Date(now));

      expect(Date.now() > now).toBe(false);
      expect(expiration.isExpired()).toBe(false);

      jest.advanceTimersByTime(1);
      expect(Date.now() > now).toBe(true);
      expect(expiration.isExpired()).toBe(true);
    });
  });
});
