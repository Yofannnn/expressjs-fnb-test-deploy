import { BaseApplicationException } from "./base-application.exception";

export class SessionNotFoundException extends BaseApplicationException {
  override readonly name = "SessionNotFoundException";
  constructor() {
    super("Session not found or has been terminated");
  }
}
