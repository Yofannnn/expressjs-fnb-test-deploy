import { AuthTokenPair } from "@/application/types/auth-token.type";

export interface RegisterCommand {
  name: string;
  address?: string;
  email: string;
  password: string;
}

export interface RegisterResult {
  tokens: AuthTokenPair;
}

export interface RegisterUseCasePort {
  execute(command: RegisterCommand): Promise<RegisterResult>;
}
