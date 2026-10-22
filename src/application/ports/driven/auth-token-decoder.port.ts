import { AccessTokenPayload, RefreshTokenPayload } from "@/application/types/auth-token.type";

export interface AuthTokenDecoderPort {
  decodeAccessToken(token: string): AccessTokenPayload | null;
  decodeRefreshToken(token: string): RefreshTokenPayload | null;
}
