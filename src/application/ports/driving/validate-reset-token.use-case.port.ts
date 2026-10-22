export interface ValidateResetTokenCommand {
  resetPasswordToken: string;
}

export interface ValidateResetTokenResult {
  expiresAt: Date;
  remainingTimeMs: number;
}

export interface ValidateResetTokenUseCasePort {
  execute(command: ValidateResetTokenCommand): Promise<ValidateResetTokenResult>;
}
