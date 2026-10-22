import { BaseDomainException } from "./base-domain.exception";

export class AccountLockedException extends BaseDomainException {
  override readonly name = "AccountLockedException";
  constructor(lockedUntil: Date, attempts: number) {
    super("Account is temporarily locked due to multiple failed login attempts");
    this.withDetails({ lockedUntil, attempts });
  }
}

export class AuthenticationNotAllowedException extends BaseDomainException {
  override readonly name = "AuthenticationNotAllowedException";
  constructor(userStatus: string) {
    super(`User with status ${userStatus} cannot authenticate.`);
    this.withDetails({ userStatus });
  }
}

export class ProfileModificationNotAllowedException extends BaseDomainException {
  override readonly name = "ProfileModificationNotAllowedException";
  constructor(userStatus: string) {
    super(`User with status ${userStatus} cannot modify profile.`);
    this.withDetails({ userStatus });
  }
}

export class UserActivationNotAllowedException extends BaseDomainException {
  override readonly name = "UserActivationNotAllowedException";
  constructor(userStatus: string) {
    super(`User with status ${userStatus} cannot be activated.`);
    this.withDetails({ userStatus });
  }
}

export class RoleAlreadyAssignedException extends BaseDomainException {
  override readonly name = "RoleAlreadyAssignedException";
  constructor(role: string) {
    super(`User already has the ${role} role.`);
    this.withDetails({ role });
  }
}

export class RoleChangeNotAllowedException extends BaseDomainException {
  override readonly name = "RoleChangeNotAllowedException";
  constructor(userStatus: string) {
    super(`User with status ${userStatus} cannot change role.`);
    this.withDetails({ userStatus });
  }
}

export class ActionReasonRequiredException extends BaseDomainException {
  override readonly name = "ActionReasonRequiredException";
  constructor(action: string) {
    super(`A valid reason is required to ${action} the user.`);
    this.withDetails({ action });
  }
}

export class InvalidStatusTransitionException extends BaseDomainException {
  override readonly name = "InvalidStatusTransitionException";
  constructor(currentStatus: string, attemptedAction: string) {
    super(`Cannot ${attemptedAction} ${currentStatus} user`);
    this.withDetails({ currentStatus, attemptedAction });
  }
}

export class SelfActionNotAllowedException extends BaseDomainException {
  override readonly name = "SelfActionNotAllowedException";
  constructor(action: string) {
    super(`Cannot ${action} yourself.`);
    this.withDetails({ action });
  }
}

export class EmailAlreadyVerifiedException extends BaseDomainException {
  override readonly name = "EmailAlreadyVerifiedException";
  constructor() {
    super("Email already verified.");
  }
}

export class EmailUnchangedException extends BaseDomainException {
  override readonly name = "EmailUnchangedException";
  constructor() {
    super("The new email is the same as your current email.");
  }
}

export class PasswordUnchangedException extends BaseDomainException {
  override readonly name = "PasswordUnchangedException";
  constructor() {
    super("The new password is the same as the current password.");
  }
}

export class ActionNotAuthorizedException extends BaseDomainException {
  override readonly name = "ActionNotAuthorizedException";
  constructor(role: string, action: string) {
    super(`User with role ${role} is not authorized to ${action}.`);
    this.withDetails({ role, action });
  }
}
