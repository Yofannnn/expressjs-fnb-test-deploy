import { PaymentDetailsView, PaymentTransactionPlainObject } from "@/application/types/payment-transaction.type";
import { UserRoleType } from "@/domain/types/user.type";

export interface GetPaymentsByOrderIdCommand {
  orderId: string;
  role?: UserRoleType;
  memberId?: string;
  guestToken?: string;
}

export interface CustomerPaymentsResult {
  scope: "customer";
  payments: PaymentDetailsView[];
}

export interface StaffPaymentsResult {
  scope: "staff";
  payments: PaymentTransactionPlainObject[];
}

export type GetPaymentsByOrderIdResult = CustomerPaymentsResult | StaffPaymentsResult;

export interface GetPaymentsByOrderIdUseCasePort {
  execute(command: GetPaymentsByOrderIdCommand): Promise<GetPaymentsByOrderIdResult>;
}
