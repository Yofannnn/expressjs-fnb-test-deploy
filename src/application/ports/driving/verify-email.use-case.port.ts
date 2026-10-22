export interface VerifyEmailCommand {
  verifyEmailToken: string;
}
export interface VerifyEmailResult {
  userId: string;
}

export interface VerifyEmailUseCasePort {
  execute(command: VerifyEmailCommand): Promise<VerifyEmailResult>;
}
