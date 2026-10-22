import { AuthTokenPair } from "@/application/types/auth-token.type";

export interface LoginCommand {
  email: string;
  password: string;
}

export interface LoginResult {
  tokens: AuthTokenPair;
}

export interface LoginUseCasePort {
  execute(command: LoginCommand): Promise<LoginResult>;
}
