import { UserRoleType } from "@/domain/types/user.type";

export interface AuthTokenPair {
  readonly accessToken: string;
  readonly refreshToken: string;
}

export interface AccessTokenPayload {
  readonly sub: string;
  readonly email: string;
  readonly name: string;
  readonly role: UserRoleType;
}

export interface RefreshTokenPayload {
  readonly sid: string;
  readonly sub: string;
}
