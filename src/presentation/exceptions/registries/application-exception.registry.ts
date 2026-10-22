import { Severity } from "@/application/types/severity.type";
import { BaseApplicationException } from "@/application/exceptions/base-application.exception";
import {
  InvalidCredentialsException,
  UnauthenticatedException,
  InvalidAccessTokenException,
  InvalidRefreshTokenException,
} from "@/application/exceptions/auth.exceptions";
import {
  VerificationTokenNotFoundException,
  VerificationTokenRateLimitExceededException,
  ResetTokenNotFoundException,
  ResetTokenRateLimitExceededException,
  GuestOrderTokenNotFoundException,
  GuestOrderTokenRenewRateLimitExceededException,
  GuestOrderTokenRenewCooldownActiveException,
} from "@/application/exceptions/application-token.exceptions";
import { OrderNotFoundException } from "@/application/exceptions/order.exceptions";
import {
  PaymentNotFoundException,
  ChargeNotSuccessfulException,
  MissingPaymentMethodException,
} from "@/application/exceptions/payment-transaction.exceptions";
import { ProductCategoryNotFoundException } from "@/application/exceptions/product-category.exceptions";
import {
  ProductNotFoundException,
  ConflictingProductStockOperationException,
  NoProductStockOperationException,
  NoReorderProductImageOperationException,
} from "@/application/exceptions/product.exceptions";
import { SessionNotFoundException } from "@/application/exceptions/session.exceptions";
import { UserNotFoundException, EmailExistsException } from "@/application/exceptions/user.exceptions";
import { HttpExceptionMapping } from "../exception.mapper";

type ExceptionConstructor = new (...args: any[]) => BaseApplicationException;

export const applicationExceptionMap = new Map<ExceptionConstructor, HttpExceptionMapping>([
  // Authentication
  [InvalidCredentialsException, { statusCode: 401, severity: Severity.LOW, retryable: false }],
  [UnauthenticatedException, { statusCode: 401, severity: Severity.LOW, retryable: false }],
  [InvalidAccessTokenException, { statusCode: 401, severity: Severity.LOW, retryable: false }],
  [InvalidRefreshTokenException, { statusCode: 401, severity: Severity.LOW, retryable: false }],

  // Application tokens (verification, reset, guest)
  [VerificationTokenNotFoundException, { statusCode: 404, severity: Severity.LOW, retryable: false }],
  [VerificationTokenRateLimitExceededException, { statusCode: 429, severity: Severity.LOW, retryable: false }],
  [ResetTokenNotFoundException, { statusCode: 404, severity: Severity.LOW, retryable: false }],
  [ResetTokenRateLimitExceededException, { statusCode: 429, severity: Severity.LOW, retryable: false }],
  [GuestOrderTokenNotFoundException, { statusCode: 404, severity: Severity.LOW, retryable: false }],
  [GuestOrderTokenRenewRateLimitExceededException, { statusCode: 429, severity: Severity.LOW, retryable: false }],
  [GuestOrderTokenRenewCooldownActiveException, { statusCode: 429, severity: Severity.LOW, retryable: false }],

  // Orders
  [OrderNotFoundException, { statusCode: 404, severity: Severity.LOW, retryable: false }],

  // Payments
  [PaymentNotFoundException, { statusCode: 404, severity: Severity.LOW, retryable: false }],
  [ChargeNotSuccessfulException, { statusCode: 422, severity: Severity.LOW, retryable: false }],
  [MissingPaymentMethodException, { statusCode: 400, severity: Severity.LOW, retryable: false }],

  // Product categories
  [ProductCategoryNotFoundException, { statusCode: 404, severity: Severity.LOW, retryable: false }],

  // Products
  [ProductNotFoundException, { statusCode: 404, severity: Severity.LOW, retryable: false }],
  [ConflictingProductStockOperationException, { statusCode: 409, severity: Severity.LOW, retryable: false }],
  [NoProductStockOperationException, { statusCode: 400, severity: Severity.LOW, retryable: false }],
  [NoReorderProductImageOperationException, { statusCode: 400, severity: Severity.LOW, retryable: false }],

  // Sessions
  [SessionNotFoundException, { statusCode: 404, severity: Severity.LOW, retryable: false }],

  // Users
  [UserNotFoundException, { statusCode: 404, severity: Severity.LOW, retryable: false }],
  [EmailExistsException, { statusCode: 409, severity: Severity.LOW, retryable: false }],
]);
