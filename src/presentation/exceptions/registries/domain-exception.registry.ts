import { Severity } from "@/application/types/severity.type";
import { BaseDomainException } from "@/domain/exceptions/base-domain.exception";
import { ForbiddenActionException } from "@/domain/exceptions/access-control.exceptions";
import {
  VerificationEmailTokenExpiredException,
  VerificationEmailTokenAlreadyUsedException,
  PasswordResetTokenExpiredException,
  PasswordResetTokenExpiredBeyondGracePeriodException,
  PasswordResetTokenAlreadyUsedException,
  GuestOrderManagementTokenExpiredException,
} from "@/domain/exceptions/application-token.exceptions";
import { InvalidCoordinateException, InvalidCoordinateFormatException } from "@/domain/exceptions/coordinate.exceptions";
import { InvalidExpirationDateException, InvalidExpirationDurationException } from "@/domain/exceptions/expiration.exceptions";
import { InvalidNumericArgumentException } from "@/domain/exceptions/invalid-argument.exceptions";
import {
  InvalidMoneyAmountException,
  NegativeMoneyAmountException,
  InsufficientMoneyAmountException,
  InvalidMoneyDivisionException,
} from "@/domain/exceptions/money.exceptions";
import {
  InvalidOrderStatusTransitionException,
  OrderAlreadyPaidException,
  InvalidOrderTypeOperationException,
  DeliveryDistanceExceededException,
  InvalidOrderGuestDataException,
  InvalidFulfillmentAccessException,
  DeliveryAddressRequiredException,
  DeliveryLatitudeRequiredException,
  DeliveryLongitudeRequiredException,
  InvalidOrderPaymentStateTransitionException,
  MinimumOrderQuantityNotMetException,
  OrderContainsUnknownProductsException,
} from "@/domain/exceptions/order.exceptions";
import {
  InvalidPaymentTransactionTransitionException,
  ZeroRefundException,
  InvalidRefundSourceException,
  RefundOnUnsuccessfulChargeException,
  RefundAmountExceedsPreviousRefundsException,
} from "@/domain/exceptions/payment-transaction.exceptions";
import {
  ProductCategoryInactiveException,
  ProductCategoryIncompleteReorderListException,
  UnknownProductCategoryInReorderException,
  ProductCategoryDuplicateSortOrderException,
} from "@/domain/exceptions/product-category.exceptions";
import {
  InvalidStockQuantityException,
  InvalidRestockQuantityException,
  InvalidDeductQuantityException,
  InsufficientStockException,
  InvalidPreparationTimeException,
  ProductWithoutImageException,
  ProductImageNotFoundException,
  InvalidReorderProductImageException,
} from "@/domain/exceptions/product.exceptions";
import { SessionAlreadyExpiredException, SessionAlreadyRevokedException } from "@/domain/exceptions/session.exceptions";
import {
  AccountLockedException,
  AuthenticationNotAllowedException,
  ProfileModificationNotAllowedException,
  UserActivationNotAllowedException,
  RoleAlreadyAssignedException,
  RoleChangeNotAllowedException,
  ActionReasonRequiredException,
  InvalidStatusTransitionException,
  SelfActionNotAllowedException,
  EmailAlreadyVerifiedException,
  EmailUnchangedException,
  PasswordUnchangedException,
  ActionNotAuthorizedException,
} from "@/domain/exceptions/user.exceptions";
import { HttpExceptionMapping } from "../exception.mapper";

type ExceptionConstructor = new (...args: any[]) => BaseDomainException;

export const domainExceptionMap = new Map<ExceptionConstructor, HttpExceptionMapping>([
  // Access control
  [ForbiddenActionException, { statusCode: 403, severity: Severity.LOW, retryable: false }],

  // Application tokens
  [VerificationEmailTokenExpiredException, { statusCode: 410, severity: Severity.LOW, retryable: false }],
  [VerificationEmailTokenAlreadyUsedException, { statusCode: 409, severity: Severity.LOW, retryable: false }],
  [PasswordResetTokenExpiredException, { statusCode: 410, severity: Severity.LOW, retryable: false }],
  [PasswordResetTokenExpiredBeyondGracePeriodException, { statusCode: 410, severity: Severity.LOW, retryable: false }],
  [PasswordResetTokenAlreadyUsedException, { statusCode: 409, severity: Severity.LOW, retryable: false }],
  [GuestOrderManagementTokenExpiredException, { statusCode: 410, severity: Severity.LOW, retryable: false }],

  // Coordinates
  [InvalidCoordinateException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [InvalidCoordinateFormatException, { statusCode: 400, severity: Severity.LOW, retryable: false }],

  // Expiration
  [InvalidExpirationDateException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [InvalidExpirationDurationException, { statusCode: 400, severity: Severity.LOW, retryable: false }],

  // Invalid argument
  [InvalidNumericArgumentException, { statusCode: 400, severity: Severity.LOW, retryable: false }],

  // Money
  [InvalidMoneyAmountException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [NegativeMoneyAmountException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [InsufficientMoneyAmountException, { statusCode: 422, severity: Severity.LOW, retryable: false }],
  [InvalidMoneyDivisionException, { statusCode: 400, severity: Severity.LOW, retryable: false }],

  // Orders
  [InvalidOrderStatusTransitionException, { statusCode: 422, severity: Severity.LOW, retryable: false }],
  [OrderAlreadyPaidException, { statusCode: 409, severity: Severity.LOW, retryable: false }],
  [InvalidOrderTypeOperationException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [DeliveryDistanceExceededException, { statusCode: 422, severity: Severity.LOW, retryable: false }],
  [InvalidOrderGuestDataException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [InvalidFulfillmentAccessException, { statusCode: 403, severity: Severity.LOW, retryable: false }],
  [DeliveryAddressRequiredException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [DeliveryLatitudeRequiredException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [DeliveryLongitudeRequiredException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [InvalidOrderPaymentStateTransitionException, { statusCode: 422, severity: Severity.LOW, retryable: false }],
  [MinimumOrderQuantityNotMetException, { statusCode: 422, severity: Severity.LOW, retryable: false }],
  [OrderContainsUnknownProductsException, { statusCode: 400, severity: Severity.LOW, retryable: false }],

  // Payment transactions
  [InvalidPaymentTransactionTransitionException, { statusCode: 422, severity: Severity.LOW, retryable: false }],
  [ZeroRefundException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [InvalidRefundSourceException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [RefundOnUnsuccessfulChargeException, { statusCode: 422, severity: Severity.LOW, retryable: false }],
  [RefundAmountExceedsPreviousRefundsException, { statusCode: 422, severity: Severity.LOW, retryable: false }],

  // Product categories
  [ProductCategoryInactiveException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [ProductCategoryIncompleteReorderListException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [UnknownProductCategoryInReorderException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [ProductCategoryDuplicateSortOrderException, { statusCode: 409, severity: Severity.LOW, retryable: false }],

  // Products
  [InvalidStockQuantityException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [InvalidRestockQuantityException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [InvalidDeductQuantityException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [InsufficientStockException, { statusCode: 422, severity: Severity.LOW, retryable: false }],
  [InvalidPreparationTimeException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [ProductWithoutImageException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [ProductImageNotFoundException, { statusCode: 404, severity: Severity.LOW, retryable: false }],
  [InvalidReorderProductImageException, { statusCode: 400, severity: Severity.LOW, retryable: false }],

  // Sessions
  [SessionAlreadyExpiredException, { statusCode: 410, severity: Severity.LOW, retryable: false }],
  [SessionAlreadyRevokedException, { statusCode: 410, severity: Severity.LOW, retryable: false }],

  // Users
  [AccountLockedException, { statusCode: 403, severity: Severity.LOW, retryable: false }],
  [AuthenticationNotAllowedException, { statusCode: 401, severity: Severity.LOW, retryable: false }],
  [ProfileModificationNotAllowedException, { statusCode: 403, severity: Severity.LOW, retryable: false }],
  [UserActivationNotAllowedException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [RoleAlreadyAssignedException, { statusCode: 409, severity: Severity.LOW, retryable: false }],
  [RoleChangeNotAllowedException, { statusCode: 403, severity: Severity.LOW, retryable: false }],
  [ActionReasonRequiredException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [InvalidStatusTransitionException, { statusCode: 422, severity: Severity.LOW, retryable: false }],
  [SelfActionNotAllowedException, { statusCode: 403, severity: Severity.LOW, retryable: false }],
  [EmailAlreadyVerifiedException, { statusCode: 409, severity: Severity.LOW, retryable: false }],
  [EmailUnchangedException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [PasswordUnchangedException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [ActionNotAuthorizedException, { statusCode: 403, severity: Severity.LOW, retryable: false }],
]);
