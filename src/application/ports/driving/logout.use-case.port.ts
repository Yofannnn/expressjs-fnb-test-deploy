export interface LogoutCommand {
  refreshToken: string;
  accessToken?: string;
}

export interface LogoutUseCasePort {
  execute(command: LogoutCommand): Promise<void>;
}
