import { BaseApplicationException } from "./base-application.exception";

export class UserNotFoundException extends BaseApplicationException {
  override readonly name = "UserNotFoundException";
  constructor() {
    super("User account not found");
  }
}

export class EmailExistsException extends BaseApplicationException {
  override readonly name = "EmailExistsException";
  constructor() {
    super("An account with this email address already exists");
  }
}
