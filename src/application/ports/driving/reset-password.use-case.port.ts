export interface ResetPasswordCommand {
  resetPasswordToken: string;
  newPassword: string;
}

export interface ResetPasswordUseCasePort {
  execute(command: ResetPasswordCommand): Promise<void>;
}
