import { BaseDomainException } from "./base-domain.exception";

export class InvalidOrderStatusTransitionException extends BaseDomainException {
  override readonly name = "InvalidOrderStatusTransitionException";
  constructor(orderId: string, from: string, to: string) {
    super(`Order ${orderId} cannot transition order from ${from} to ${to}`);
  }
}

export class OrderAlreadyPaidException extends BaseDomainException {
  override readonly name = "OrderAlreadyPaidException";
  constructor(orderId: string) {
    super(`Order ${orderId} is already paid`);
  }
}

export class InvalidOrderTypeOperationException extends BaseDomainException {
  override readonly name = "InvalidOrderTypeOperationException";
  constructor(orderId: string, operation: string, expectedType: string, actualType: string) {
    super(`Cannot ${operation}: order ${orderId} is type ${actualType}, expected ${expectedType}`);
  }
}

export class DeliveryDistanceExceededException extends BaseDomainException {
  override readonly name = "DeliveryDistanceExceededException";
  constructor(distanceKm: number, maxDeliveryDistanceKm: number) {
    super(`Delivery distance ${Math.round(distanceKm)} km exceeds maximum ${maxDeliveryDistanceKm}km`);
  }
}

export class InvalidOrderGuestDataException extends BaseDomainException {
  override readonly name = "InvalidOrderGuestDataException";
  constructor() {
    super("Guest orders require both a guest name and a guest email");
  }
}

export class InvalidFulfillmentAccessException extends BaseDomainException {
  override readonly name = "InvalidFulfillmentAccessException";
  constructor(actualType: string, accessedAs: string) {
    super(`Cannot access fulfillment as ${accessedAs}: this order is type ${actualType}`);
  }
}

export class DeliveryAddressRequiredException extends BaseDomainException {
  override readonly name = "DeliveryAddressRequiredException";
  constructor() {
    super("A delivery address must be provided for delivery orders.");
  }
}

export class DeliveryLatitudeRequiredException extends BaseDomainException {
  override readonly name = "DeliveryLatitudeRequiredException";
  constructor() {
    super("A delivery latitude must be provided for delivery orders.");
  }
}

export class DeliveryLongitudeRequiredException extends BaseDomainException {
  override readonly name = "DeliveryLongitudeRequiredException";
  constructor() {
    super("A delivery longitude must be provided for delivery orders.");
  }
}

export class InvalidOrderPaymentStateTransitionException extends BaseDomainException {
  override readonly name = "InvalidOrderPaymentStateTransitionException";
  constructor(from: string, to: string) {
    super(`Cannot change payment status from '${from}' to '${to}'.`);
  }
}

export class MinimumOrderQuantityNotMetException extends BaseDomainException {
  override readonly name = "MinimumOrderQuantityNotMetException";
  constructor(minimum: number, actual: number) {
    super(`Minimum order quantity not met (minimum: ${minimum}, actual: ${actual})`);
    this.withDetails({ minimum, actual });
  }
}

export class OrderContainsUnknownProductsException extends BaseDomainException {
  override readonly name = "OrderContainsUnknownProductsException";
  constructor() {
    super("Order contains unknown products");
  }
}
