import { PaymentTransaction } from "@/domain/entities/payment-transaction.entity";

export interface PaymentTransactionRepositoryPort {
  insert(transaction: PaymentTransaction): Promise<void>;
  update(transaction: PaymentTransaction): Promise<void>;
  findById(id: string): Promise<PaymentTransaction | null>;
  findByProviderReferenceId(providerReferenceId: string): Promise<PaymentTransaction | null>;
  findByOrderId(orderId: string): Promise<PaymentTransaction[]>;
}
