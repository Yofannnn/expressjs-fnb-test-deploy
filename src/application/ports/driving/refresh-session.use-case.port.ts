import { AuthTokenPair } from "@/application/types/auth-token.type";

export interface RefreshSessionCommand {
  refreshToken: string;
}

export interface RefreshSessionResult {
  tokens: AuthTokenPair;
}

export interface RefreshSessionUseCasePort {
  execute(command: RefreshSessionCommand): Promise<RefreshSessionResult>;
}
