export interface HandlePaymentCommand {
  paymentId: string;
  providerReferenceId?: string;
}

export interface HandlePaymentResult {
  id: string;
  orderId: string;
}

export interface HandlePaymentUseCasePort {
  execute(command: HandlePaymentCommand): Promise<HandlePaymentResult>;
}
