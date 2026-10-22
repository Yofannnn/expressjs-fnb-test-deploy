import { BaseApplicationException } from "./base-application.exception";

export class OrderNotFoundException extends BaseApplicationException {
  override readonly name = "OrderNotFoundException";
  constructor() {
    super("Order not found");
  }
}
