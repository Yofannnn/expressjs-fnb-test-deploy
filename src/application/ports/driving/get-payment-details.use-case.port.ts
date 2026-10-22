import { PaymentDetailsView, PaymentTransactionPlainObject } from "@/application/types/payment-transaction.type";
import { UserRoleType } from "@/domain/types/user.type";

export interface GetPaymentDetailsCommand {
  orderId: string;
  paymentId: string;
  role?: UserRoleType;
  memberId?: string;
  guestToken?: string;
}

export interface CustomerPaymentDetailsResult {
  scope: "customer";
  payment: PaymentDetailsView;
}

export interface StaffPaymentDetailsResult {
  scope: "staff";
  payment: PaymentTransactionPlainObject;
}

export type GetPaymentDetailsResult = CustomerPaymentDetailsResult | StaffPaymentDetailsResult;

export interface GetPaymentDetailsUseCasePort {
  execute(command: GetPaymentDetailsCommand): Promise<GetPaymentDetailsResult>;
}
