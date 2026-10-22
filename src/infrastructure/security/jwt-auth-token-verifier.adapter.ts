import { UserRoleType } from "@/domain/types/user.type";
import { AuthTokenVerifierPort } from "@/application/ports/driven/auth-token-verifier.port";
import { AccessTokenPayload, RefreshTokenPayload } from "@/application/types/auth-token.type";
import { InvalidAccessTokenException, InvalidRefreshTokenException } from "@/application/exceptions/auth.exceptions";
import { JwtConfig } from "../configs/jwt.config";
import jwt, { JwtPayload } from "jsonwebtoken";

export class JWTAuthTokenVerifierAdapter implements AuthTokenVerifierPort {
  constructor(private readonly config: JwtConfig) {}

  verifyAccessToken(token: string): AccessTokenPayload {
    const decoded = this.verify(token, this.config.accessSecret, () => new InvalidAccessTokenException());
    return this.parseAccessTokenPayload(decoded);
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    const decoded = this.verify(token, this.config.refreshSecret, () => new InvalidRefreshTokenException());
    return this.parseRefreshTokenPayload(decoded);
  }

  private verify(token: string, secret: string, onError: () => unknown): JwtPayload {
    let decoded: string | JwtPayload;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      throw onError();
    }

    if (typeof decoded === "string") throw onError();

    return decoded;
  }

  private parseAccessTokenPayload(decoded: JwtPayload): AccessTokenPayload {
    const { sub, email, name, role } = decoded;

    if (typeof sub !== "string" || typeof email !== "string" || typeof name !== "string" || !this.isUserRoleType(role)) {
      throw new InvalidAccessTokenException();
    }

    return { sub, email, name, role };
  }

  private parseRefreshTokenPayload(decoded: JwtPayload): RefreshTokenPayload {
    const { sub, sid } = decoded;

    if (typeof sub !== "string" || typeof sid !== "string") {
      throw new InvalidRefreshTokenException();
    }

    return { sub, sid };
  }

  private isUserRoleType(value: unknown): value is UserRoleType {
    return typeof value === "string" && Object.values(UserRoleType).includes(value as UserRoleType);
  }
}
