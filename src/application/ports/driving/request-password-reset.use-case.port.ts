export interface RequestPasswordResetCommand {
  email: string;
}

export interface RequestPasswordResetUseCasePort {
  execute(command: RequestPasswordResetCommand): Promise<void>;
}
