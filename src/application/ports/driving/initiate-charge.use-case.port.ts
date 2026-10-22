import { PaymentMethod } from "@/domain/types/payment-transaction.type";

export interface InitiateChargeCommand {
  orderId: string;
  memberId?: string;
  guestToken?: string;
  method?: PaymentMethod;
}

export interface InitiateChargeResult {
  id: string;
  redirectUrl: string | null;
  snapToken: string | null;
}

export interface InitiateChargeUseCasePort {
  execute(command: InitiateChargeCommand): Promise<InitiateChargeResult>;
}
