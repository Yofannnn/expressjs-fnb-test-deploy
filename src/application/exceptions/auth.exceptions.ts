import { BaseApplicationException } from "./base-application.exception";

export class InvalidCredentialsException extends BaseApplicationException {
  override readonly name = "InvalidCredentialsException";
  constructor() {
    super("Invalid email or password");
  }
}

export class UnauthenticatedException extends BaseApplicationException {
  override readonly name = "UnauthenticatedException";
  constructor() {
    super("You must be logged in to perform this action");
  }
}

export class InvalidAccessTokenException extends BaseApplicationException {
  override readonly name = "InvalidAccessTokenException";
  constructor() {
    super("Invalid or malformed access token");
  }
}

export class InvalidRefreshTokenException extends BaseApplicationException {
  override readonly name = "InvalidRefreshTokenException";
  constructor() {
    super("Invalid or malformed refresh token");
  }
}
