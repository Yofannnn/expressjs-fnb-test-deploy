import { User } from "@/domain/entities/user.entity";
import { IdGeneratorPort } from "../ports/driven/id-generator.port";
import { RequestContextPort } from "../ports/driven/request-context.port";
import { AuthTokenIssuerPort } from "../ports/driven/auth-token-issuer.port";
import { Session } from "@/domain/entities/session.entity";
import { AuthTokenPair } from "../types/auth-token.type";
import { TimeUtil } from "@/utils/time.util";
import { SessionPolicy } from "../../domain/policies/session.policy";
import { FingerprintPort } from "../ports/driven/fingerprint.port";

interface SessionBuildResult extends AuthTokenPair {
  session: Session;
}

export class SessionFactory {
  private readonly refreshExpiresAt: Date;

  constructor(
    private readonly sessionPolicy: SessionPolicy,
    private readonly authTokenIssuer: AuthTokenIssuerPort,
    private readonly fingerprintProvider: FingerprintPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly requestContext: RequestContextPort,
  ) {
    this.refreshExpiresAt = new Date(Date.now() + TimeUtil.daysToMs(this.sessionPolicy.refreshTokenLifetimeDays));
  }

  build(user: User, continuedTokenFamily?: string): SessionBuildResult {
    const accessToken = this.authTokenIssuer.issueAccessToken(user);
    const { deviceId, ipAddress, userAgent } = this.requestContext.get();
    const sessionId = this.idGenerator.generate();
    const refreshToken = this.authTokenIssuer.issueRefreshToken(user, sessionId);
    const tokenFamily = continuedTokenFamily || this.idGenerator.generate();
    const tokenFingerprint = this.fingerprintProvider.fingerprint(refreshToken);
    const expiresAt = this.refreshExpiresAt;
    const session = Session.create({
      id: sessionId,
      tokenFingerprint,
      tokenFamily,
      expiresAt,
      userId: user.getId(),
      ipAddress,
      deviceId,
      userAgent,
    });

    return { accessToken, refreshToken, session };
  }
}
