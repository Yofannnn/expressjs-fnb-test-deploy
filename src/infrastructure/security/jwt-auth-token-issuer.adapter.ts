import { AccessTokenPayload, RefreshTokenPayload } from "@/application/types/auth-token.type";
import { AuthTokenIssuerPort } from "@/application/ports/driven/auth-token-issuer.port";
import { User } from "@/domain/entities/user.entity";
import jwt from "jsonwebtoken";
import { JwtConfig } from "../configs/jwt.config";
import { SessionPolicy } from "@/domain/policies/session.policy";

export class JWTAuthTokenIssuerAdapter implements AuthTokenIssuerPort {
  constructor(
    private readonly sessionPolicy: SessionPolicy,
    private readonly config: JwtConfig,
  ) {}

  issueAccessToken(user: User): string {
    const payload: AccessTokenPayload = {
      sub: user.getId(),
      email: user.getEmail(),
      name: user.getName(),
      role: user.getRole(),
    };

    return jwt.sign(payload, this.config.accessSecret, {
      expiresIn: `${this.sessionPolicy.accessTokenLifetimeMinutes}m`,
    });
  }

  issueRefreshToken(user: User, sessionId: string): string {
    const payload: RefreshTokenPayload = {
      sid: sessionId,
      sub: user.getId(),
    };

    return jwt.sign(payload, this.config.refreshSecret, {
      expiresIn: `${this.sessionPolicy.refreshTokenLifetimeDays}d`,
    });
  }
}
