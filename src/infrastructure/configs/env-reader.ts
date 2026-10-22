export const env = {
  string(key: string, fallback?: string): string {
    const value = process.env[key];
    if (!value && fallback !== undefined) return fallback;
    if (!value) throw new Error(`${key} is required`);
    return value;
  },
  number(key: string, fallback?: number): number {
    const value = process.env[key];
    if (!value && fallback !== undefined) return fallback;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) throw new Error(`${key} must be a number`);
    return parsed;
  },
  boolean(key: string, fallback = false): boolean {
    const value = process.env[key];
    if (!value) return fallback;
    return value.toLowerCase() === "true";
  },
  array(key: string, fallback?: string[]): string[] {
    const value = process.env[key];

    if (!value) {
      if (fallback !== undefined) return fallback;
      throw new Error(`${key} is required`);
    }

    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  },
  optionalString(key: string): string | undefined {
    const value = process.env[key]?.trim();
    return value ? value : undefined;
  },
};
