import { AuthTokenDecoderPort } from "@/application/ports/driven/auth-token-decoder.port";
import { AccessTokenPayload, RefreshTokenPayload } from "@/application/types/auth-token.type";
import { UserRoleType } from "@/domain/types/user.type";
import jwt, { JwtPayload } from "jsonwebtoken";

export class JwtAuthTokenDecoderAdapter implements AuthTokenDecoderPort {
  decodeAccessToken(token: string): AccessTokenPayload | null {
    const decoded = jwt.decode(token) as JwtPayload | null;

    if (!decoded) return null;

    return this.parseAccessTokenPayload(decoded);
  }

  decodeRefreshToken(token: string): RefreshTokenPayload | null {
    const decoded = jwt.decode(token) as JwtPayload | null;

    if (!decoded) return null;

    return this.parseRefreshTokenPayload(decoded);
  }

  private parseAccessTokenPayload(decoded: JwtPayload): AccessTokenPayload | null {
    const { sub, email, name, role } = decoded;

    if (typeof sub !== "string" || typeof email !== "string" || typeof name !== "string" || !this.isUserRoleType(role)) return null;

    return { sub, email, name, role };
  }

  private parseRefreshTokenPayload(decoded: JwtPayload): RefreshTokenPayload | null {
    const { sub, sid } = decoded;

    if (typeof sub !== "string" || typeof sid !== "string") return null;

    return { sub, sid };
  }

  private isUserRoleType(value: unknown): value is UserRoleType {
    return typeof value === "string" && Object.values(UserRoleType).includes(value as UserRoleType);
  }
}
