import { BaseDomainException } from "./base-domain.exception";

export class InvalidNumericArgumentException extends BaseDomainException {
  override readonly name = "InvalidNumericArgumentException";
  constructor(paramName: string, value: unknown, reason?: string) {
    super(`Invalid numeric argument '${paramName}': ${value}${reason ? ` (${reason})` : ""}`);
  }
}
