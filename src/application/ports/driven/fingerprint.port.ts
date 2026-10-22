export interface FingerprintPort {
  fingerprint(value: string): string;
  compareFingerprint(value: string, storedFingerprint: string): boolean;
}
