import { AccessTokenPayload, RefreshTokenPayload } from "@/application/types/auth-token.type";

export interface AuthTokenVerifierPort {
  verifyAccessToken(token: string): AccessTokenPayload;
  verifyRefreshToken(token: string): RefreshTokenPayload;
}
