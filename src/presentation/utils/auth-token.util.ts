import { Request } from "express";
import { AUTH_CONSTANTS } from "../constants/auth.constants";

export class AuthTokenUtil {
  static getAccessToken(req: Request): string | undefined {
    return this.extractBearerToken(req.headers.authorization);
  }

  static getRefreshToken(req: Request): string | undefined {
    return req.cookies?.[AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE_NAME];
  }

  private static extractBearerToken(header?: string) {
    if (!header) return undefined;

    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) return undefined;

    return token;
  }
}
