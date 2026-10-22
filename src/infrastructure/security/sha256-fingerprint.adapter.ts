import crypto from "crypto";
import { FingerprintPort } from "@/application/ports/driven/fingerprint.port";

export class Sha256FingerprintAdapter implements FingerprintPort {
  private readonly algorithm = "sha256";

  fingerprint(value: string): string {
    return crypto.createHash(this.algorithm).update(value).digest("hex");
  }

  compareFingerprint(value: string, storedFingerprint: string): boolean {
    if (!value || !storedFingerprint) return false;
    const a = Buffer.from(this.fingerprint(value), "hex");
    const b = Buffer.from(storedFingerprint, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
}
