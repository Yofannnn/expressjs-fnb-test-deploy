type TimeUnit = "ms" | "seconds" | "minutes" | "hours" | "days";
type ShortTimeUnit = "s" | "m" | "h" | "d";
type DateFormat = "short" | "long" | "numeric";
type DateSeparator = "/" | "-";

interface UnitConfig {
  readonly unit: TimeUnit;
  readonly short: ShortTimeUnit;
  readonly label: string;
  readonly ms: number;
}

interface ExpiryResult {
  expiresAt: Date;
  expiresInMs: number;
}

export class TimeUtil {
  private static readonly UNIT_CONFIGS: Record<TimeUnit, UnitConfig> = {
    ms: { unit: "ms", short: "s" as ShortTimeUnit, label: "milliseconds", ms: 1 },
    seconds: { unit: "seconds", short: "s" as ShortTimeUnit, label: "seconds", ms: 1000 },
    minutes: { unit: "minutes", short: "m" as ShortTimeUnit, label: "minutes", ms: 60 * 1000 },
    hours: { unit: "hours", short: "h" as ShortTimeUnit, label: "hours", ms: 60 * 60 * 1000 },
    days: { unit: "days", short: "d" as ShortTimeUnit, label: "days", ms: 24 * 60 * 60 * 1000 },
  };

  private static readonly SHORT_TO_UNIT: Record<ShortTimeUnit, TimeUnit> = {
    s: "seconds",
    m: "minutes",
    h: "hours",
    d: "days",
  };

  // ============ Validation ============
  private static ensurePositive(value: number, label: string): void {
    if (value < 0) {
      throw new Error(`${label} cannot be negative`);
    }
    if (!Number.isFinite(value)) {
      throw new Error(`${label} must be a finite number`);
    }
  }

  private static ensureValidDate(date: Date | string): Date {
    const parsed = date instanceof Date ? date : new Date(date);
    if (isNaN(parsed.getTime())) {
      throw new Error("Invalid date provided");
    }
    return parsed;
  }

  // ============ Conversion Utilities ============
  static toMs(amount: number, unit: TimeUnit): number {
    this.ensurePositive(amount, unit);
    return amount * this.UNIT_CONFIGS[unit].ms;
  }

  static fromMs(ms: number, unit: TimeUnit): number {
    this.ensurePositive(ms, "Milliseconds");
    return ms / this.UNIT_CONFIGS[unit].ms;
  }

  // ============ Unit Converters ============
  static hoursToMs(hours: number): number {
    return this.toMs(hours, "hours");
  }

  static minutesToMs(minutes: number): number {
    return this.toMs(minutes, "minutes");
  }

  static secondsToMs(seconds: number): number {
    return this.toMs(seconds, "seconds");
  }

  static daysToMs(days: number): number {
    return this.toMs(days, "days");
  }

  static msToSeconds(ms: number): number {
    return Math.floor(this.fromMs(ms, "seconds"));
  }

  static msToMinutes(ms: number): number {
    return this.fromMs(ms, "minutes");
  }

  static msToHours(ms: number): number {
    return this.fromMs(ms, "hours");
  }

  static msToDays(ms: number): number {
    return this.fromMs(ms, "days");
  }

  // ============ Time Operations ============
  static now(): number {
    return Date.now();
  }

  static addTime(from: Date, amount: number, unit: TimeUnit): Date {
    const ms = this.toMs(amount, unit);
    return new Date(from.getTime() + ms);
  }

  static subtractTime(from: Date, amount: number, unit: TimeUnit): Date {
    const ms = this.toMs(amount, unit);
    return new Date(from.getTime() - ms);
  }

  static isExpired(date: Date): boolean {
    return date.getTime() < this.now();
  }

  static getTimeUntilExpiration(expirationDate: Date | string): number {
    const date = this.ensureValidDate(expirationDate);
    const remaining = date.getTime() - this.now();
    return Math.max(0, remaining);
  }

  static getTimeSince(date: Date | string): number {
    const parsed = this.ensureValidDate(date);
    return Math.max(0, this.now() - parsed.getTime());
  }

  // ============ Date Comparison ============
  static isBefore(date1: Date | string, date2: Date | string): boolean {
    const d1 = this.ensureValidDate(date1);
    const d2 = this.ensureValidDate(date2);
    return d1.getTime() < d2.getTime();
  }

  static isAfter(date1: Date | string, date2: Date | string): boolean {
    const d1 = this.ensureValidDate(date1);
    const d2 = this.ensureValidDate(date2);
    return d1.getTime() > d2.getTime();
  }

  static isSameDay(date1: Date | string, date2: Date | string): boolean {
    const d1 = this.ensureValidDate(date1);
    const d2 = this.ensureValidDate(date2);
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  }

  // ============ Formatting ============
  static formatDuration(ms: number, compact: boolean = false): string {
    if (ms <= 0) return compact ? "0s" : "0 seconds";

    const units: [TimeUnit, string][] = [
      ["days", "d"],
      ["hours", "h"],
      ["minutes", "m"],
      ["seconds", "s"],
    ];

    const parts: string[] = [];
    let remaining = ms;

    for (const [unit, symbol] of units) {
      const unitMs = this.UNIT_CONFIGS[unit].ms;
      const value = Math.floor(remaining / unitMs);
      if (value > 0) {
        parts.push(compact ? `${value}${symbol}` : `${value} ${unit}`);
        remaining -= value * unitMs;
      }
    }

    return parts.join(compact ? " " : ", ");
  }

  static formatDate(
    date: Date | string,
    locales: Intl.LocalesArgument = "en-US",
    type: DateFormat = "short",
    separator: DateSeparator = "/",
  ): string {
    const parsed = this.ensureValidDate(date);

    switch (type) {
      case "short":
        return parsed.toLocaleDateString(locales, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      case "long":
        return parsed.toLocaleDateString(locales, {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      case "numeric": {
        const day = String(parsed.getDate()).padStart(2, "0");
        const month = String(parsed.getMonth() + 1).padStart(2, "0");
        const year = String(parsed.getFullYear());
        return [day, month, year].join(separator);
      }
    }
  }

  static formatTime(date: Date | string, locales: Intl.LocalesArgument = "en-US"): string {
    const parsed = this.ensureValidDate(date);
    return parsed.toLocaleTimeString(locales, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  static formatDateTime(date: Date | string, locales: Intl.LocalesArgument = "en-US"): string {
    const parsed = this.ensureValidDate(date);
    return parsed.toLocaleString(locales, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  // ============ Parsing ============
  static parseExpiry(expiry: string, from: Date = new Date()): ExpiryResult {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiry format: ${expiry}. Expected number + unit (s/m/h/d), e.g., "30m" or "7d"`);
    }

    const [, rawAmount, shortUnit] = match;
    const amount = parseInt(rawAmount, 10);

    if (amount <= 0) {
      throw new Error(`Expiry duration must be positive, got: ${amount}`);
    }

    const unit = this.SHORT_TO_UNIT[shortUnit as ShortTimeUnit];
    const expiresInMs = this.toMs(amount, unit);
    const expiresAt = this.addTime(from, amount, unit);

    return { expiresAt, expiresInMs };
  }

  static parseMaxExpiry(expiries: string[], from: Date = new Date()): ExpiryResult {
    if (expiries.length === 0) {
      throw new Error("At least one expiry string must be provided");
    }

    return expiries.map((e) => this.parseExpiry(e, from)).reduce((max, curr) => (curr.expiresInMs > max.expiresInMs ? curr : max));
  }

  static isValidExpiryFormat(expiry: string): boolean {
    return /^(\d+)([smhd])$/.test(expiry);
  }

  // ============ Utility ============
  static getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }

  static startOfDay(date: Date | string): Date {
    const parsed = this.ensureValidDate(date);
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  static endOfDay(date: Date | string): Date {
    const parsed = this.ensureValidDate(date);
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59, 999);
  }

  static getWeekNumber(date: Date | string): number {
    const parsed = this.ensureValidDate(date);
    const d = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    const dayNum = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dayNum + 3);
    const firstThursday = d.valueOf();
    d.setMonth(0, 1);
    if (d.getDay() !== 4) {
      d.setMonth(0, 1 + ((4 - d.getDay() + 7) % 7));
    }
    return 1 + Math.ceil((firstThursday - d.valueOf()) / 604800000);
  }
}
