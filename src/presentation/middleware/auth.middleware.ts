import { Request, Response, NextFunction } from "express";
import { AuthTokenUtil } from "../utils/auth-token.util";
import { AuthTokenVerifierPort } from "@/application/ports/driven/auth-token-verifier.port";
import { AuthenticatedRequest } from "../types/authenticated-request.type";
import { UnauthenticatedException } from "@/application/exceptions/auth.exceptions";

export function authMiddleware(authTokenVerifier: AuthTokenVerifierPort) {
  return (req: Request, res: Response, next: NextFunction) => {
    const accessToken = AuthTokenUtil.getAccessToken(req);
    if (!accessToken) throw new UnauthenticatedException();

    (req as AuthenticatedRequest).auth = authTokenVerifier.verifyAccessToken(accessToken);

    next();
  };
}
