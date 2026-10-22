import crypto from "crypto";
import { TokenGeneratorPort } from "@/application/ports/driven/token-generator.port";

export class CryptoTokenGeneratorAdapter implements TokenGeneratorPort {
  private static readonly DEFAULT_LENGTH = 32;

  generate(length: number = CryptoTokenGeneratorAdapter.DEFAULT_LENGTH): string {
    const safeLength = Number.isFinite(length) && length > 0 ? Math.floor(length) : CryptoTokenGeneratorAdapter.DEFAULT_LENGTH;
    return crypto.randomBytes(safeLength).toString("hex");
  }
}
