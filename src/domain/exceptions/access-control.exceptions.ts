import { BaseDomainException } from "./base-domain.exception";

export class ForbiddenActionException extends BaseDomainException {
  override readonly name = "ForbiddenActionException";
  constructor(actor: string, action: string) {
    super(`Forbidden: ${actor} cannot ${action}.`);
    this.withDetails({ actor, action });
  }
}
