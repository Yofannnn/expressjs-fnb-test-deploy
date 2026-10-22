import { BaseDomainException } from "./base-domain.exception";

export class InvalidCoordinateException extends BaseDomainException {
  override readonly name = "InvalidCoordinateException";
  constructor(message: string) {
    super(message);
  }
}

export class InvalidCoordinateFormatException extends BaseDomainException {
  override readonly name = "InvalidCoordinateFormatException";
  constructor(message: string) {
    super(message);
  }
}
