import { BaseDomainException } from "./base-domain.exception";

export class SessionAlreadyExpiredException extends BaseDomainException {
  override readonly name = "SessionAlreadyExpiredException";
  constructor() {
    super("Session already expired");
  }
}

export class SessionAlreadyRevokedException extends BaseDomainException {
  override readonly name = "SessionAlreadyRevokedException";
  constructor() {
    super("Session already revoked");
  }
}
