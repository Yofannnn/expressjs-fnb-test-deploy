export interface RenewGuestOrderTokenCommand {
  orderId: string;
  email: string;
}

export interface RenewGuestOrderTokenUseCasePort {
  execute(command: RenewGuestOrderTokenCommand): Promise<void>;
}
