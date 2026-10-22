import { TimeUtil } from "@/utils/time.util";

describe("TimeUtil", () => {
  describe("toMs", () => {
    it("should convert seconds to milliseconds", () => {
      expect(TimeUtil.toMs(1, "seconds")).toBe(1000);
      expect(TimeUtil.toMs(30, "seconds")).toBe(30000);
      expect(TimeUtil.toMs(60, "seconds")).toBe(60000);
    });

    it("should convert minutes to milliseconds", () => {
      expect(TimeUtil.toMs(1, "minutes")).toBe(60000);
      expect(TimeUtil.toMs(30, "minutes")).toBe(1800000);
      expect(TimeUtil.toMs(60, "minutes")).toBe(3600000);
    });

    it("should convert hours to milliseconds", () => {
      expect(TimeUtil.toMs(1, "hours")).toBe(3600000);
      expect(TimeUtil.toMs(2, "hours")).toBe(7200000);
      expect(TimeUtil.toMs(24, "hours")).toBe(86400000);
    });

    it("should convert days to milliseconds", () => {
      expect(TimeUtil.toMs(1, "days")).toBe(86400000);
      expect(TimeUtil.toMs(7, "days")).toBe(604800000);
      expect(TimeUtil.toMs(30, "days")).toBe(2592000000);
    });

    it("should convert milliseconds to milliseconds", () => {
      expect(TimeUtil.toMs(500, "ms")).toBe(500);
      expect(TimeUtil.toMs(1000, "ms")).toBe(1000);
    });

    it("should handle zero values", () => {
      expect(TimeUtil.toMs(0, "seconds")).toBe(0);
      expect(TimeUtil.toMs(0, "minutes")).toBe(0);
      expect(TimeUtil.toMs(0, "hours")).toBe(0);
      expect(TimeUtil.toMs(0, "days")).toBe(0);
      expect(TimeUtil.toMs(0, "ms")).toBe(0);
    });

    it("should handle decimal values", () => {
      expect(TimeUtil.toMs(0.5, "seconds")).toBe(500);
      expect(TimeUtil.toMs(0.5, "minutes")).toBe(30000);
      expect(TimeUtil.toMs(1.5, "hours")).toBe(5400000);
      expect(TimeUtil.toMs(0.5, "days")).toBe(43200000);
    });

    it("should throw error for negative values", () => {
      expect(() => TimeUtil.toMs(-1, "seconds")).toThrow("seconds cannot be negative");
      expect(() => TimeUtil.toMs(-5, "minutes")).toThrow("minutes cannot be negative");
      expect(() => TimeUtil.toMs(-1, "hours")).toThrow("hours cannot be negative");
      expect(() => TimeUtil.toMs(-1, "days")).toThrow("days cannot be negative");
      expect(() => TimeUtil.toMs(-100, "ms")).toThrow("ms cannot be negative");
    });

    it("should throw error for non-finite values", () => {
      expect(() => TimeUtil.toMs(Infinity, "seconds")).toThrow("seconds must be a finite number");
      expect(() => TimeUtil.toMs(NaN, "seconds")).toThrow("seconds must be a finite number");
    });
  });

  describe("fromMs", () => {
    it("should convert milliseconds to seconds", () => {
      expect(TimeUtil.fromMs(1000, "seconds")).toBe(1);
      expect(TimeUtil.fromMs(30000, "seconds")).toBe(30);
      expect(TimeUtil.fromMs(60000, "seconds")).toBe(60);
    });

    it("should convert milliseconds to minutes", () => {
      expect(TimeUtil.fromMs(60000, "minutes")).toBe(1);
      expect(TimeUtil.fromMs(1800000, "minutes")).toBe(30);
      expect(TimeUtil.fromMs(3600000, "minutes")).toBe(60);
    });

    it("should convert milliseconds to hours", () => {
      expect(TimeUtil.fromMs(3600000, "hours")).toBe(1);
      expect(TimeUtil.fromMs(7200000, "hours")).toBe(2);
      expect(TimeUtil.fromMs(86400000, "hours")).toBe(24);
    });

    it("should convert milliseconds to days", () => {
      expect(TimeUtil.fromMs(86400000, "days")).toBe(1);
      expect(TimeUtil.fromMs(604800000, "days")).toBe(7);
      expect(TimeUtil.fromMs(2592000000, "days")).toBe(30);
    });

    it("should convert milliseconds to milliseconds", () => {
      expect(TimeUtil.fromMs(500, "ms")).toBe(500);
      expect(TimeUtil.fromMs(1000, "ms")).toBe(1000);
    });

    it("should handle zero values", () => {
      expect(TimeUtil.fromMs(0, "seconds")).toBe(0);
      expect(TimeUtil.fromMs(0, "minutes")).toBe(0);
      expect(TimeUtil.fromMs(0, "hours")).toBe(0);
      expect(TimeUtil.fromMs(0, "days")).toBe(0);
    });

    it("should handle decimal results", () => {
      expect(TimeUtil.fromMs(1800000, "hours")).toBe(0.5);
      expect(TimeUtil.fromMs(5400000, "hours")).toBe(1.5);
      expect(TimeUtil.fromMs(43200000, "days")).toBe(0.5);
    });

    it("should throw error for negative milliseconds", () => {
      expect(() => TimeUtil.fromMs(-1000, "seconds")).toThrow("Milliseconds cannot be negative");
      expect(() => TimeUtil.fromMs(-1000, "minutes")).toThrow("Milliseconds cannot be negative");
      expect(() => TimeUtil.fromMs(-1000, "hours")).toThrow("Milliseconds cannot be negative");
      expect(() => TimeUtil.fromMs(-1000, "days")).toThrow("Milliseconds cannot be negative");
    });

    it("should throw error for non-finite milliseconds", () => {
      expect(() => TimeUtil.fromMs(Infinity, "seconds")).toThrow("Milliseconds must be a finite number");
      expect(() => TimeUtil.fromMs(NaN, "seconds")).toThrow("Milliseconds must be a finite number");
    });
  });

  describe("hoursToMs", () => {
    it("should convert hours to milliseconds", () => {
      expect(TimeUtil.hoursToMs(1)).toBe(3600000);
      expect(TimeUtil.hoursToMs(2)).toBe(7200000);
      expect(TimeUtil.hoursToMs(24)).toBe(86400000);
    });

    it("should handle zero hours", () => {
      expect(TimeUtil.hoursToMs(0)).toBe(0);
    });

    it("should handle decimal hours", () => {
      expect(TimeUtil.hoursToMs(0.5)).toBe(1800000);
      expect(TimeUtil.hoursToMs(1.5)).toBe(5400000);
    });

    it("should throw error for negative hours", () => {
      expect(() => TimeUtil.hoursToMs(-1)).toThrow("hours cannot be negative");
    });
  });

  describe("minutesToMs", () => {
    it("should convert minutes to milliseconds", () => {
      expect(TimeUtil.minutesToMs(1)).toBe(60000);
      expect(TimeUtil.minutesToMs(30)).toBe(1800000);
      expect(TimeUtil.minutesToMs(60)).toBe(3600000);
    });

    it("should handle zero minutes", () => {
      expect(TimeUtil.minutesToMs(0)).toBe(0);
    });

    it("should handle decimal minutes", () => {
      expect(TimeUtil.minutesToMs(0.5)).toBe(30000);
    });

    it("should throw error for negative minutes", () => {
      expect(() => TimeUtil.minutesToMs(-5)).toThrow("minutes cannot be negative");
    });
  });

  describe("secondsToMs", () => {
    it("should convert seconds to milliseconds", () => {
      expect(TimeUtil.secondsToMs(1)).toBe(1000);
      expect(TimeUtil.secondsToMs(30)).toBe(30000);
      expect(TimeUtil.secondsToMs(60)).toBe(60000);
    });

    it("should handle zero seconds", () => {
      expect(TimeUtil.secondsToMs(0)).toBe(0);
    });

    it("should handle decimal seconds", () => {
      expect(TimeUtil.secondsToMs(0.5)).toBe(500);
    });

    it("should throw error for negative seconds", () => {
      expect(() => TimeUtil.secondsToMs(-10)).toThrow("seconds cannot be negative");
    });
  });

  describe("daysToMs", () => {
    it("should convert days to milliseconds", () => {
      expect(TimeUtil.daysToMs(1)).toBe(86400000);
      expect(TimeUtil.daysToMs(7)).toBe(604800000);
      expect(TimeUtil.daysToMs(30)).toBe(2592000000);
    });

    it("should handle zero days", () => {
      expect(TimeUtil.daysToMs(0)).toBe(0);
    });

    it("should handle decimal days", () => {
      expect(TimeUtil.daysToMs(0.5)).toBe(43200000);
    });

    it("should throw error for negative days", () => {
      expect(() => TimeUtil.daysToMs(-1)).toThrow("days cannot be negative");
    });
  });

  describe("msToSeconds", () => {
    it("should convert milliseconds to seconds", () => {
      expect(TimeUtil.msToSeconds(1000)).toBe(1);
      expect(TimeUtil.msToSeconds(30000)).toBe(30);
      expect(TimeUtil.msToSeconds(60000)).toBe(60);
    });

    it("should floor the result", () => {
      expect(TimeUtil.msToSeconds(1500)).toBe(1);
      expect(TimeUtil.msToSeconds(2999)).toBe(2);
    });

    it("should handle zero milliseconds", () => {
      expect(TimeUtil.msToSeconds(0)).toBe(0);
    });

    it("should throw error for negative milliseconds", () => {
      expect(() => TimeUtil.msToSeconds(-1000)).toThrow("Milliseconds cannot be negative");
    });
  });

  describe("msToMinutes", () => {
    it("should convert milliseconds to minutes", () => {
      expect(TimeUtil.msToMinutes(60000)).toBe(1);
      expect(TimeUtil.msToMinutes(1800000)).toBe(30);
      expect(TimeUtil.msToMinutes(3600000)).toBe(60);
    });

    it("should handle decimal results", () => {
      expect(TimeUtil.msToMinutes(30000)).toBe(0.5);
      expect(TimeUtil.msToMinutes(90000)).toBe(1.5);
    });

    it("should handle zero milliseconds", () => {
      expect(TimeUtil.msToMinutes(0)).toBe(0);
    });

    it("should throw error for negative milliseconds", () => {
      expect(() => TimeUtil.msToMinutes(-60000)).toThrow("Milliseconds cannot be negative");
    });
  });

  describe("msToHours", () => {
    it("should convert milliseconds to hours", () => {
      expect(TimeUtil.msToHours(3600000)).toBe(1);
      expect(TimeUtil.msToHours(7200000)).toBe(2);
      expect(TimeUtil.msToHours(86400000)).toBe(24);
    });

    it("should handle zero milliseconds", () => {
      expect(TimeUtil.msToHours(0)).toBe(0);
    });

    it("should handle decimal results", () => {
      expect(TimeUtil.msToHours(1800000)).toBe(0.5);
      expect(TimeUtil.msToHours(5400000)).toBe(1.5);
    });

    it("should throw error for negative milliseconds", () => {
      expect(() => TimeUtil.msToHours(-1000)).toThrow("Milliseconds cannot be negative");
    });
  });

  describe("msToDays", () => {
    it("should convert milliseconds to days", () => {
      expect(TimeUtil.msToDays(86400000)).toBe(1);
      expect(TimeUtil.msToDays(604800000)).toBe(7);
      expect(TimeUtil.msToDays(2592000000)).toBe(30);
    });

    it("should handle zero milliseconds", () => {
      expect(TimeUtil.msToDays(0)).toBe(0);
    });

    it("should handle decimal results", () => {
      expect(TimeUtil.msToDays(43200000)).toBe(0.5);
    });

    it("should throw error for negative milliseconds", () => {
      expect(() => TimeUtil.msToDays(-86400000)).toThrow("Milliseconds cannot be negative");
    });
  });

  describe("now", () => {
    it("should return current timestamp", () => {
      const before = Date.now();
      const result = TimeUtil.now();
      const after = Date.now();

      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });

    it("should return a number", () => {
      expect(typeof TimeUtil.now()).toBe("number");
    });
  });

  describe("addTime", () => {
    it("should add hours to a date", () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      const result = TimeUtil.addTime(startDate, 2, "hours");

      expect(result.toISOString()).toBe("2025-01-01T02:00:00.000Z");
    });

    it("should add minutes to a date", () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      const result = TimeUtil.addTime(startDate, 30, "minutes");

      expect(result.toISOString()).toBe("2025-01-01T00:30:00.000Z");
    });

    it("should add seconds to a date", () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      const result = TimeUtil.addTime(startDate, 45, "seconds");

      expect(result.toISOString()).toBe("2025-01-01T00:00:45.000Z");
    });

    it("should add days to a date", () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      const result = TimeUtil.addTime(startDate, 7, "days");

      expect(result.toISOString()).toBe("2025-01-08T00:00:00.000Z");
    });

    it("should add milliseconds to a date", () => {
      const startDate = new Date("2025-01-01T00:00:00.000Z");
      const result = TimeUtil.addTime(startDate, 500, "ms");

      expect(result.toISOString()).toBe("2025-01-01T00:00:00.500Z");
    });

    it("should not mutate original date", () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      const originalTime = startDate.getTime();

      TimeUtil.addTime(startDate, 1, "hours");

      expect(startDate.getTime()).toBe(originalTime);
    });

    it("should throw error for negative amount", () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      expect(() => TimeUtil.addTime(startDate, -1, "hours")).toThrow("hours cannot be negative");
    });

    it("should handle adding zero", () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      const result = TimeUtil.addTime(startDate, 0, "hours");

      expect(result.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    });
  });

  describe("subtractTime", () => {
    it("should subtract hours from a date", () => {
      const startDate = new Date("2025-01-01T02:00:00Z");
      const result = TimeUtil.subtractTime(startDate, 2, "hours");

      expect(result.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    });

    it("should subtract minutes from a date", () => {
      const startDate = new Date("2025-01-01T00:30:00Z");
      const result = TimeUtil.subtractTime(startDate, 30, "minutes");

      expect(result.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    });

    it("should subtract seconds from a date", () => {
      const startDate = new Date("2025-01-01T00:00:45Z");
      const result = TimeUtil.subtractTime(startDate, 45, "seconds");

      expect(result.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    });

    it("should subtract days from a date", () => {
      const startDate = new Date("2025-01-08T00:00:00Z");
      const result = TimeUtil.subtractTime(startDate, 7, "days");

      expect(result.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    });

    it("should subtract milliseconds from a date", () => {
      const startDate = new Date("2025-01-01T00:00:00.500Z");
      const result = TimeUtil.subtractTime(startDate, 500, "ms");

      expect(result.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    });

    it("should not mutate original date", () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      const originalTime = startDate.getTime();

      TimeUtil.subtractTime(startDate, 1, "hours");

      expect(startDate.getTime()).toBe(originalTime);
    });

    it("should throw error for negative amount", () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      expect(() => TimeUtil.subtractTime(startDate, -1, "hours")).toThrow("hours cannot be negative");
    });

    it("should handle subtracting zero", () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      const result = TimeUtil.subtractTime(startDate, 0, "hours");

      expect(result.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    });
  });

  describe("isExpired", () => {
    it("should return true for past dates", () => {
      const pastDate = new Date("2020-01-01T00:00:00Z");
      expect(TimeUtil.isExpired(pastDate)).toBe(true);
    });

    it("should return false for future dates", () => {
      const futureDate = new Date("2030-01-01T00:00:00Z");
      expect(TimeUtil.isExpired(futureDate)).toBe(false);
    });

    it("should return true for current time (edge case)", () => {
      const now = new Date(Date.now() - 1);
      expect(TimeUtil.isExpired(now)).toBe(true);
    });
  });

  describe("getTimeUntilExpiration", () => {
    it("should return time remaining until expiration", () => {
      const futureDate = new Date(Date.now() + 60000);
      const result = TimeUtil.getTimeUntilExpiration(futureDate);

      expect(result).toBeGreaterThan(59000);
      expect(result).toBeLessThanOrEqual(60000);
    });

    it("should return 0 for past dates", () => {
      const pastDate = new Date("2020-01-01T00:00:00Z");
      expect(TimeUtil.getTimeUntilExpiration(pastDate)).toBe(0);
    });

    it("should return 0 for current time", () => {
      const now = new Date(Date.now() - 1);
      expect(TimeUtil.getTimeUntilExpiration(now)).toBe(0);
    });

    it("should never return negative values", () => {
      const veryPastDate = new Date("1990-01-01T00:00:00Z");
      expect(TimeUtil.getTimeUntilExpiration(veryPastDate)).toBe(0);
    });

    it("should handle string date input", () => {
      const futureDate = new Date(Date.now() + 60000).toISOString();
      const result = TimeUtil.getTimeUntilExpiration(futureDate);

      expect(result).toBeGreaterThan(59000);
      expect(result).toBeLessThanOrEqual(60000);
    });

    it("should throw error for invalid date string", () => {
      expect(() => TimeUtil.getTimeUntilExpiration("invalid-date")).toThrow("Invalid date provided");
    });
  });

  describe("getTimeSince", () => {
    it("should return time since a past date", () => {
      const pastDate = new Date(Date.now() - 60000);
      const result = TimeUtil.getTimeSince(pastDate);

      expect(result).toBeGreaterThan(59000);
      expect(result).toBeLessThanOrEqual(60000);
    });

    it("should return 0 for future dates", () => {
      const futureDate = new Date(Date.now() + 60000);
      const result = TimeUtil.getTimeSince(futureDate);

      expect(result).toBe(0);
    });

    it("should return 0 for current time", () => {
      const now = new Date(Date.now() + 1);
      const result = TimeUtil.getTimeSince(now);

      expect(result).toBe(0);
    });

    it("should handle string date input", () => {
      const pastDate = new Date(Date.now() - 60000).toISOString();
      const result = TimeUtil.getTimeSince(pastDate);

      expect(result).toBeGreaterThan(59000);
      expect(result).toBeLessThanOrEqual(60000);
    });

    it("should throw error for invalid date string", () => {
      expect(() => TimeUtil.getTimeSince("invalid-date")).toThrow("Invalid date provided");
    });
  });

  describe("isBefore", () => {
    it("should return true when first date is before second", () => {
      const date1 = new Date("2025-01-01T00:00:00Z");
      const date2 = new Date("2025-01-02T00:00:00Z");

      expect(TimeUtil.isBefore(date1, date2)).toBe(true);
    });

    it("should return false when first date is after second", () => {
      const date1 = new Date("2025-01-02T00:00:00Z");
      const date2 = new Date("2025-01-01T00:00:00Z");

      expect(TimeUtil.isBefore(date1, date2)).toBe(false);
    });

    it("should return false when dates are equal", () => {
      const date1 = new Date("2025-01-01T00:00:00Z");
      const date2 = new Date("2025-01-01T00:00:00Z");

      expect(TimeUtil.isBefore(date1, date2)).toBe(false);
    });

    it("should handle string date inputs", () => {
      expect(TimeUtil.isBefore("2025-01-01T00:00:00Z", "2025-01-02T00:00:00Z")).toBe(true);
    });

    it("should throw error for invalid date string", () => {
      expect(() => TimeUtil.isBefore("invalid", "2025-01-01T00:00:00Z")).toThrow("Invalid date provided");
    });
  });

  describe("isAfter", () => {
    it("should return true when first date is after second", () => {
      const date1 = new Date("2025-01-02T00:00:00Z");
      const date2 = new Date("2025-01-01T00:00:00Z");

      expect(TimeUtil.isAfter(date1, date2)).toBe(true);
    });

    it("should return false when first date is before second", () => {
      const date1 = new Date("2025-01-01T00:00:00Z");
      const date2 = new Date("2025-01-02T00:00:00Z");

      expect(TimeUtil.isAfter(date1, date2)).toBe(false);
    });

    it("should return false when dates are equal", () => {
      const date1 = new Date("2025-01-01T00:00:00Z");
      const date2 = new Date("2025-01-01T00:00:00Z");

      expect(TimeUtil.isAfter(date1, date2)).toBe(false);
    });

    it("should handle string date inputs", () => {
      expect(TimeUtil.isAfter("2025-01-02T00:00:00Z", "2025-01-01T00:00:00Z")).toBe(true);
    });

    it("should throw error for invalid date string", () => {
      expect(() => TimeUtil.isAfter("invalid", "2025-01-01T00:00:00Z")).toThrow("Invalid date provided");
    });
  });

  describe("isSameDay", () => {
    it("should return true for dates on the same day", () => {
      const date1 = new Date("2025-01-01T10:00:00Z");
      const date2 = new Date("2025-01-01T15:00:00Z");

      expect(TimeUtil.isSameDay(date1, date2)).toBe(true);
    });

    it("should return false for dates on different days", () => {
      const date1 = new Date("2025-01-01T00:00:00Z");
      const date2 = new Date("2025-01-02T00:00:00Z");

      expect(TimeUtil.isSameDay(date1, date2)).toBe(false);
    });

    it("should return true for same date different times", () => {
      const date1 = new Date("2025-01-15T00:00:00");
      const date2 = new Date("2025-01-15T23:59:59");

      expect(TimeUtil.isSameDay(date1, date2)).toBe(true);
    });

    it("should handle string date inputs", () => {
      expect(TimeUtil.isSameDay("2025-01-01T10:00:00Z", "2025-01-01T15:00:00Z")).toBe(true);
    });

    it("should throw error for invalid date string", () => {
      expect(() => TimeUtil.isSameDay("invalid", "2025-01-01T00:00:00Z")).toThrow("Invalid date provided");
    });
  });

  describe("formatDuration", () => {
    it("should format milliseconds to compact duration", () => {
      expect(TimeUtil.formatDuration(86400000, true)).toBe("1d");
      expect(TimeUtil.formatDuration(3600000, true)).toBe("1h");
      expect(TimeUtil.formatDuration(60000, true)).toBe("1m");
      expect(TimeUtil.formatDuration(1000, true)).toBe("1s");
    });

    it("should format milliseconds to readable duration", () => {
      expect(TimeUtil.formatDuration(86400000, false)).toBe("1 days");
      expect(TimeUtil.formatDuration(3600000, false)).toBe("1 hours");
      expect(TimeUtil.formatDuration(60000, false)).toBe("1 minutes");
      expect(TimeUtil.formatDuration(1000, false)).toBe("1 seconds");
    });

    it("should format complex durations", () => {
      const duration = TimeUtil.daysToMs(3) + TimeUtil.hoursToMs(4) + TimeUtil.minutesToMs(12) + TimeUtil.secondsToMs(10);
      expect(TimeUtil.formatDuration(duration, true)).toBe("3d 4h 12m 10s");
      expect(TimeUtil.formatDuration(duration, false)).toBe("3 days, 4 hours, 12 minutes, 10 seconds");
    });

    it("should omit zero values", () => {
      const duration = TimeUtil.daysToMs(1) + TimeUtil.secondsToMs(30);
      expect(TimeUtil.formatDuration(duration, true)).toBe("1d 30s");
      expect(TimeUtil.formatDuration(duration, false)).toBe("1 days, 30 seconds");
    });

    it("should handle zero milliseconds", () => {
      expect(TimeUtil.formatDuration(0, true)).toBe("0s");
      expect(TimeUtil.formatDuration(0, false)).toBe("0 seconds");
    });

    it("should handle negative values", () => {
      expect(TimeUtil.formatDuration(-1000, true)).toBe("0s");
      expect(TimeUtil.formatDuration(-1000, false)).toBe("0 seconds");
    });

    it("should format only seconds", () => {
      expect(TimeUtil.formatDuration(45000, true)).toBe("45s");
    });

    it("should format only minutes", () => {
      expect(TimeUtil.formatDuration(300000, true)).toBe("5m");
    });

    it("should format only hours", () => {
      expect(TimeUtil.formatDuration(7200000, true)).toBe("2h");
    });

    it("should format only days", () => {
      expect(TimeUtil.formatDuration(172800000, true)).toBe("2d");
    });

    it("should format hours and minutes", () => {
      const duration = TimeUtil.hoursToMs(2) + TimeUtil.minutesToMs(30);
      expect(TimeUtil.formatDuration(duration, true)).toBe("2h 30m");
    });
  });

  describe("formatDate", () => {
    const date = new Date("2025-01-15T14:30:00Z");

    it("should format date in short format", () => {
      const result = TimeUtil.formatDate(date, "en-US", "short");
      expect(result).toBe("Jan 15, 2025");
    });

    it("should format date in long format", () => {
      const date = new Date("2025-01-15T14:30:00Z");
      const result = TimeUtil.formatDate(date, "en-US", "long");
      expect(result).toContain("January 15, 2025");
      expect(result).toContain("PM");
    });

    it("should format date in numeric format with default separator", () => {
      const result = TimeUtil.formatDate(date, "en-US", "numeric");
      expect(result).toBe("15/01/2025");
    });

    it("should format date in numeric format with custom separator", () => {
      const result = TimeUtil.formatDate(date, "en-US", "numeric", "-");
      expect(result).toBe("15-01-2025");
    });

    it("should format date in numeric format with slash separator", () => {
      const result = TimeUtil.formatDate(date, "en-US", "numeric", "/");
      expect(result).toBe("15/01/2025");
    });

    it("should handle string date input", () => {
      const result = TimeUtil.formatDate("2025-01-15T14:30:00Z", "en-US", "short");
      expect(result).toBe("Jan 15, 2025");
    });

    it("should handle different locales", () => {
      const date = new Date("2025-01-15T14:30:00Z");
      const result = TimeUtil.formatDate(date, "id-ID", "short");
      expect(result).toContain("Jan");
      expect(result).toContain("2025");
    });

    it("should throw error for invalid date", () => {
      expect(() => TimeUtil.formatDate("invalid")).toThrow("Invalid date provided");
    });
  });

  describe("formatTime", () => {
    it("should format time", () => {
      const date = new Date("2025-01-15T14:30:00Z");
      const result = TimeUtil.formatTime(date, "en-US");
      expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
    });

    it("should handle string date input", () => {
      const result = TimeUtil.formatTime("2025-01-15T14:30:00Z", "en-US");
      expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
    });

    it("should handle different locales", () => {
      const date = new Date("2025-01-15T14:30:00Z");
      const result = TimeUtil.formatTime(date, "id-ID");
      expect(result).toMatch(/\d{2}\.\d{2}/);
    });

    it("should throw error for invalid date", () => {
      expect(() => TimeUtil.formatTime("invalid")).toThrow("Invalid date provided");
    });
  });

  describe("formatDateTime", () => {
    it("should format date and time", () => {
      const date = new Date("2025-01-15T14:30:00Z");
      const result = TimeUtil.formatDateTime(date, "en-US");
      expect(result).toContain("Jan 15, 2025");
      expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
    });

    it("should handle string date input", () => {
      const result = TimeUtil.formatDateTime("2025-01-15T14:30:00Z", "en-US");
      expect(result).toContain("Jan 15, 2025");
      expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
    });

    it("should handle different locales", () => {
      const date = new Date("2025-01-15T14:30:00Z");
      const result = TimeUtil.formatDateTime(date, "id-ID");
      expect(result).toContain("15 Jan 2025");
      expect(result).toMatch(/\d{2}\.\d{2}/);
    });

    it("should throw error for invalid date", () => {
      expect(() => TimeUtil.formatDateTime("invalid")).toThrow("Invalid date provided");
    });
  });

  describe("parseExpiry", () => {
    it("should parse seconds", () => {
      const from = new Date("2025-01-01T00:00:00Z");
      const result = TimeUtil.parseExpiry("30s", from);

      expect(result.expiresInMs).toBe(30000);
      expect(result.expiresAt.toISOString()).toBe("2025-01-01T00:00:30.000Z");
    });

    it("should parse minutes", () => {
      const from = new Date("2025-01-01T00:00:00Z");
      const result = TimeUtil.parseExpiry("15m", from);

      expect(result.expiresInMs).toBe(900000);
      expect(result.expiresAt.toISOString()).toBe("2025-01-01T00:15:00.000Z");
    });

    it("should parse hours", () => {
      const from = new Date("2025-01-01T00:00:00Z");
      const result = TimeUtil.parseExpiry("2h", from);

      expect(result.expiresInMs).toBe(7200000);
      expect(result.expiresAt.toISOString()).toBe("2025-01-01T02:00:00.000Z");
    });

    it("should parse days", () => {
      const from = new Date("2025-01-01T00:00:00Z");
      const result = TimeUtil.parseExpiry("7d", from);

      expect(result.expiresInMs).toBe(604800000);
      expect(result.expiresAt.toISOString()).toBe("2025-01-08T00:00:00.000Z");
    });

    it("should use current date when from is not provided", () => {
      const before = Date.now();
      const result = TimeUtil.parseExpiry("1h");
      const after = Date.now();

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + TimeUtil.hoursToMs(1));
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(after + TimeUtil.hoursToMs(1));
    });

    it("should throw error for invalid format", () => {
      expect(() => TimeUtil.parseExpiry("invalid")).toThrow("Invalid expiry format: invalid");
    });

    it("should throw error for missing unit", () => {
      expect(() => TimeUtil.parseExpiry("30")).toThrow("Invalid expiry format");
    });

    it("should throw error for invalid unit", () => {
      expect(() => TimeUtil.parseExpiry("30x")).toThrow("Invalid expiry format");
    });

    it("should throw error for zero duration", () => {
      expect(() => TimeUtil.parseExpiry("0s")).toThrow("Expiry duration must be positive, got: 0");
    });

    it("should throw error for negative duration", () => {
      expect(() => TimeUtil.parseExpiry("-5m")).toThrow("Invalid expiry format");
    });

    it("should handle large numbers", () => {
      const from = new Date("2025-01-01T00:00:00Z");
      const result = TimeUtil.parseExpiry("999d", from);

      expect(result.expiresInMs).toBe(TimeUtil.daysToMs(999));
    });

    it("should throw error for decimal values", () => {
      expect(() => TimeUtil.parseExpiry("1.5h")).toThrow("Invalid expiry format");
    });

    it("should throw error for space in format", () => {
      expect(() => TimeUtil.parseExpiry("30 m")).toThrow("Invalid expiry format");
    });
  });

  describe("parseMaxExpiry", () => {
    it("should return the maximum expiry from multiple strings", () => {
      const from = new Date("2025-01-01T00:00:00Z");
      const result = TimeUtil.parseMaxExpiry(["30s", "15m", "1h"], from);

      expect(result.expiresInMs).toBe(TimeUtil.hoursToMs(1));
      expect(result.expiresAt.toISOString()).toBe("2025-01-01T01:00:00.000Z");
    });

    it("should work with single expiry", () => {
      const from = new Date("2025-01-01T00:00:00Z");
      const result = TimeUtil.parseMaxExpiry(["30m"], from);

      expect(result.expiresInMs).toBe(TimeUtil.minutesToMs(30));
    });

    it("should handle days as maximum", () => {
      const from = new Date("2025-01-01T00:00:00Z");
      const result = TimeUtil.parseMaxExpiry(["30s", "15m", "7d"], from);

      expect(result.expiresInMs).toBe(TimeUtil.daysToMs(7));
      expect(result.expiresAt.toISOString()).toBe("2025-01-08T00:00:00.000Z");
    });

    it("should use current date when from is not provided", () => {
      const before = Date.now();
      const result = TimeUtil.parseMaxExpiry(["1h", "30m"]);
      const after = Date.now();

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + TimeUtil.hoursToMs(1));
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(after + TimeUtil.hoursToMs(1));
    });

    it("should throw error for empty array", () => {
      expect(() => TimeUtil.parseMaxExpiry([])).toThrow("At least one expiry string must be provided");
    });

    it("should throw error if any expiry is invalid", () => {
      expect(() => TimeUtil.parseMaxExpiry(["30m", "invalid", "1h"])).toThrow("Invalid expiry format");
    });

    it("should handle all same values", () => {
      const from = new Date("2025-01-01T00:00:00Z");
      const result = TimeUtil.parseMaxExpiry(["1h", "1h", "1h"], from);

      expect(result.expiresInMs).toBe(TimeUtil.hoursToMs(1));
    });

    it("should handle very large numbers", () => {
      const from = new Date("2025-01-01T00:00:00Z");
      const result = TimeUtil.parseMaxExpiry(["1d", "999d"], from);

      expect(result.expiresInMs).toBe(TimeUtil.daysToMs(999));
    });
  });

  describe("isValidExpiryFormat", () => {
    it("should return true for valid seconds format", () => {
      expect(TimeUtil.isValidExpiryFormat("30s")).toBe(true);
      expect(TimeUtil.isValidExpiryFormat("1s")).toBe(true);
      expect(TimeUtil.isValidExpiryFormat("999s")).toBe(true);
    });

    it("should return true for valid minutes format", () => {
      expect(TimeUtil.isValidExpiryFormat("15m")).toBe(true);
      expect(TimeUtil.isValidExpiryFormat("1m")).toBe(true);
      expect(TimeUtil.isValidExpiryFormat("60m")).toBe(true);
    });

    it("should return true for valid hours format", () => {
      expect(TimeUtil.isValidExpiryFormat("2h")).toBe(true);
      expect(TimeUtil.isValidExpiryFormat("24h")).toBe(true);
      expect(TimeUtil.isValidExpiryFormat("1h")).toBe(true);
    });

    it("should return true for valid days format", () => {
      expect(TimeUtil.isValidExpiryFormat("7d")).toBe(true);
      expect(TimeUtil.isValidExpiryFormat("30d")).toBe(true);
      expect(TimeUtil.isValidExpiryFormat("1d")).toBe(true);
    });

    it("should return false for invalid formats", () => {
      expect(TimeUtil.isValidExpiryFormat("invalid")).toBe(false);
      expect(TimeUtil.isValidExpiryFormat("30")).toBe(false);
      expect(TimeUtil.isValidExpiryFormat("s30")).toBe(false);
      expect(TimeUtil.isValidExpiryFormat("30x")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(TimeUtil.isValidExpiryFormat("")).toBe(false);
    });

    it("should return false for decimal values", () => {
      expect(TimeUtil.isValidExpiryFormat("1.5h")).toBe(false);
    });

    it("should return false for negative values", () => {
      expect(TimeUtil.isValidExpiryFormat("-5m")).toBe(false);
    });

    it("should return true for zero", () => {
      expect(TimeUtil.isValidExpiryFormat("0s")).toBe(true);
    });

    it("should return false for spaces", () => {
      expect(TimeUtil.isValidExpiryFormat("30 m")).toBe(false);
      expect(TimeUtil.isValidExpiryFormat(" 30m")).toBe(false);
      expect(TimeUtil.isValidExpiryFormat("30m ")).toBe(false);
    });

    it("should return false for multiple units", () => {
      expect(TimeUtil.isValidExpiryFormat("1h30m")).toBe(false);
    });
  });

  describe("getDaysInMonth", () => {
    it("should return correct days for January", () => {
      expect(TimeUtil.getDaysInMonth(2025, 1)).toBe(31);
    });

    it("should return correct days for February in non-leap year", () => {
      expect(TimeUtil.getDaysInMonth(2023, 2)).toBe(28);
    });

    it("should return correct days for February in leap year", () => {
      expect(TimeUtil.getDaysInMonth(2024, 2)).toBe(29);
    });

    it("should return correct days for April", () => {
      expect(TimeUtil.getDaysInMonth(2025, 4)).toBe(30);
    });

    it("should return correct days for December", () => {
      expect(TimeUtil.getDaysInMonth(2025, 12)).toBe(31);
    });
  });

  describe("startOfDay", () => {
    it("should return start of day", () => {
      const date = new Date("2025-01-15T14:30:00Z");
      const result = TimeUtil.startOfDay(date);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });

    it("should handle string date input", () => {
      const result = TimeUtil.startOfDay("2025-01-15T14:30:00Z");
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });

    it("should throw error for invalid date", () => {
      expect(() => TimeUtil.startOfDay("invalid")).toThrow("Invalid date provided");
    });
  });

  describe("endOfDay", () => {
    it("should return end of day", () => {
      const date = new Date("2025-01-15T14:30:00Z");
      const result = TimeUtil.endOfDay(date);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
    });

    it("should handle string date input", () => {
      const result = TimeUtil.endOfDay("2025-01-15T14:30:00Z");
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
    });

    it("should throw error for invalid date", () => {
      expect(() => TimeUtil.endOfDay("invalid")).toThrow("Invalid date provided");
    });
  });

  describe("getWeekNumber", () => {
    it("should return correct week number", () => {
      const date = new Date("2025-01-15T00:00:00Z");
      const result = TimeUtil.getWeekNumber(date);

      expect(result).toBe(3);
    });

    it("should handle date at beginning of year", () => {
      const date = new Date("2025-01-01T00:00:00Z");
      const result = TimeUtil.getWeekNumber(date);

      expect(result).toBe(1);
    });

    it("should handle date at end of year", () => {
      const date = new Date("2025-12-31T00:00:00Z");
      const result = TimeUtil.getWeekNumber(date);

      expect(result).toBe(1);
    });

    it("should handle string date input", () => {
      const result = TimeUtil.getWeekNumber("2025-01-15T00:00:00Z");

      expect(result).toBe(3);
    });

    it("should throw error for invalid date", () => {
      expect(() => TimeUtil.getWeekNumber("invalid")).toThrow("Invalid date provided");
    });
  });

  describe("edge cases and integration", () => {
    it("should handle very large time values", () => {
      const largeMs = TimeUtil.daysToMs(365 * 10);
      expect(largeMs).toBeGreaterThan(0);
      expect(TimeUtil.msToDays(largeMs)).toBe(3650);
    });

    it("should handle very small time values", () => {
      expect(TimeUtil.secondsToMs(0.001)).toBe(1);
    });

    it("should maintain precision in conversions", () => {
      const hours = 1.5;
      const ms = TimeUtil.hoursToMs(hours);
      const backToHours = TimeUtil.msToHours(ms);

      expect(backToHours).toBe(hours);
    });

    it("should handle round-trip conversions", () => {
      const days = 7;
      const ms = TimeUtil.daysToMs(days);
      const backToDays = TimeUtil.msToDays(ms);

      expect(backToDays).toBe(days);
    });

    it("should format and parse consistently", () => {
      const from = new Date("2025-01-01T00:00:00Z");
      const parsed = TimeUtil.parseExpiry("30m", from);
      const formatted = TimeUtil.formatDuration(parsed.expiresInMs, true);

      expect(formatted).toBe("30m");
    });

    it("should handle timezone offset in date formatting", () => {
      const date = new Date("2025-01-15T14:30:00-05:00");
      const result = TimeUtil.formatDate(date, "en-US", "short");
      expect(result).toMatch(/Jan 15, 2025|Jan 16, 2025/);
    });
  });
});
