import { RefreshSessionUseCasePort, RefreshSessionCommand, RefreshSessionResult } from "@/application/ports/driving/refresh-session.use-case.port";
import { SessionRepositoryPort } from "@/application/ports/driven/session.repository.port";
import { UserRepositoryPort } from "@/application/ports/driven/user.repository.port";
import { Session } from "@/domain/entities/session.entity";
import { AuthTokenVerifierPort } from "@/application/ports/driven/auth-token-verifier.port";
import { User } from "@/domain/entities/user.entity";
import { FingerprintPort } from "@/application/ports/driven/fingerprint.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { UnitOfWorkPort } from "@/application/ports/driven/unit-of-work.port";
import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { SessionFactory } from "@/application/factories/session.factory";
import { RequestContextPort } from "@/application/ports/driven/request-context.port";
import { InvalidRefreshTokenException } from "@/application/exceptions/auth.exceptions";
import { UserNotFoundException } from "@/application/exceptions/user.exceptions";
import { SessionNotFoundException } from "@/application/exceptions/session.exceptions";

export class RefreshSessionUseCase implements RefreshSessionUseCasePort {
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly sessionFactory: SessionFactory,
    private readonly authTokenVerifier: AuthTokenVerifierPort,
    private readonly fingerprintProvider: FingerprintPort,
    private readonly eventBus: EventBusPort,
    private readonly requestContext: RequestContextPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: RefreshSessionCommand): Promise<RefreshSessionResult> {
    const startTime = Date.now();

    this.logRefreshStart();

    const payload = this.authTokenVerifier.verifyRefreshToken(command.refreshToken);

    const result = await this.uow.commit(async (repos) => {
      const oldSession = await this.findSessionRecord(payload.sid, repos.sessionRepository);
      this.validateSessionIntegrity(oldSession, command.refreshToken);
      this.checkClientContextMismatch(oldSession);

      const user = await this.findUser(oldSession.getUserId(), repos.userRepository);
      user.assertCanAuthenticate();

      oldSession.revoke(`Session rotated for user ${user.getId()}`);
      await repos.sessionRepository.update(oldSession);

      const { session: newSession, refreshToken, accessToken } = this.sessionFactory.build(user, oldSession.getTokenFamily());
      await repos.sessionRepository.insert(newSession);

      const events = [...oldSession.pullDomainEvents(), ...newSession.pullDomainEvents()];

      return { authToken: { accessToken, refreshToken }, user, session: newSession, events };
    });

    this.logSuccessfulRefresh(result.user, result.session.getId(), startTime);

    await this.eventBus.publishAll(result.events);

    return { tokens: result.authToken };
  }

  private async findSessionRecord(sessionId: string, sessionRepo: SessionRepositoryPort): Promise<Session> {
    const session = await sessionRepo.findById(sessionId);
    if (!session) throw new SessionNotFoundException();

    return session;
  }

  private validateSessionIntegrity(session: Session, refreshToken: string): void {
    if (!session.isActive()) throw new InvalidRefreshTokenException();

    const isValidToken = this.fingerprintProvider.compareFingerprint(refreshToken, session.getTokenFingerprint());
    if (!isValidToken) throw new InvalidRefreshTokenException();
  }

  private checkClientContextMismatch(session: Session): void {
    const { ipAddress: currentIp, userAgent: currentUserAgent } = this.requestContext.get();
    const isClientContextMismatch = currentIp !== session.getIpAddress() || currentUserAgent !== session.getUserAgent();

    if (isClientContextMismatch) {
      this.logger.warn({
        context: "RefreshSessionUseCase",
        event: "CLIENT_CONTEXT_MISMATCH",
        message: `Client context mismatch detected during session refresh`,
        sessionId: session.getId(),
        userId: session.getUserId(),
      });
    }
  }

  private async findUser(userId: string, userRepo: UserRepositoryPort): Promise<User> {
    const user = await userRepo.findById(userId);
    if (!user) throw new UserNotFoundException();

    return user;
  }

  private logRefreshStart(): void {
    this.logger.debug({
      context: "RefreshSessionUseCase",
      event: "REFRESH_SESSION_STARTED",
      message: `Refresh session started`,
    });
  }

  private logSuccessfulRefresh(user: User, sessionId: string, startTime: number): void {
    this.logger.info({
      context: "RefreshSessionUseCase",
      event: "REFRESH_SESSION_SUCCESSFUL",
      message: `User refreshed session successfully`,
      userId: user.getId(),
      sessionId: sessionId,
      durationMs: Date.now() - startTime,
      data: {
        role: user.getRole(),
        email: user.getEmail(),
      },
    });
  }
}
