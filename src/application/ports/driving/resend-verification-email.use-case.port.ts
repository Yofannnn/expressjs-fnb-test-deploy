export interface ResendVerificationEmailCommand {
  userId: string;
}

export interface ResendVerificationEmailUseCasePort {
  execute(command: ResendVerificationEmailCommand): Promise<void>;
}
