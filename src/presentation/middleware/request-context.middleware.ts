import { Request, Response, NextFunction } from "express";
import { NodeAsyncLocalStorage } from "@/infrastructure/request-context/node-async-local-storage";
import { AuthTokenUtil } from "../utils/auth-token.util";
import { IdGeneratorPort } from "@/application/ports/driven/id-generator.port";
import { AuthTokenDecoderPort } from "@/application/ports/driven/auth-token-decoder.port";

export function requestContextMiddleware(
  nodeAsyncLocalStorage: NodeAsyncLocalStorage,
  idGenerator: IdGeneratorPort,
  authTokenDecoder: AuthTokenDecoderPort,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const accessToken = AuthTokenUtil.getAccessToken(req);

    nodeAsyncLocalStorage.run(
      {
        requestId: idGenerator.generate(),
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        deviceId: req.get("x-device-id"),
        userId: resolveUserId(accessToken, authTokenDecoder),
      },
      () => next(),
    );
  };
}

function resolveUserId(accessToken: string | undefined, authTokenDecoder: AuthTokenDecoderPort): string | undefined {
  if (!accessToken) return undefined;

  try {
    return authTokenDecoder.decodeAccessToken(accessToken)?.sub;
  } catch {
    return undefined;
  }
}
