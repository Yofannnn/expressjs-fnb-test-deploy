import { LogoutUseCasePort, LogoutCommand } from "@/application/ports/driving/logout.use-case.port";
import { SessionRepositoryPort } from "@/application/ports/driven/session.repository.port";
import { AuthTokenVerifierPort } from "@/application/ports/driven/auth-token-verifier.port";
import { Session } from "@/domain/entities/session.entity";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { User } from "@/domain/entities/user.entity";
import { UserRepositoryPort } from "@/application/ports/driven/user.repository.port";
import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { UnitOfWorkPort } from "@/application/ports/driven/unit-of-work.port";
import { RequestContextPort } from "@/application/ports/driven/request-context.port";
import { SessionNotFoundException } from "@/application/exceptions/session.exceptions";
import { UserNotFoundException } from "@/application/exceptions/user.exceptions";

/**
 * @todo
 * blacklist access token
 */

export class LogoutUseCase implements LogoutUseCasePort {
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly authTokenVerifier: AuthTokenVerifierPort,
    private readonly eventBus: EventBusPort,
    private readonly requestContext: RequestContextPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    const startTime = Date.now();

    this.logLogoutStart();

    const payload = this.authTokenVerifier.verifyRefreshToken(command.refreshToken);

    const result = await this.uow.commit(async (repos) => {
      const session = await this.findSessionRecord(payload.sid, repos.sessionRepository);
      const user = await this.findUserById(session.getUserId(), repos.userRepository);

      await this.performLogout(user, session);
      await Promise.all([repos.userRepository.update(user), repos.sessionRepository.update(session)]);

      const events = [...user.pullDomainEvents(), ...session.pullDomainEvents()];

      return { events, user, oldSession: session };
    });

    this.logSuccessfulLogout(result.user.getId(), result.oldSession.getId(), startTime);

    await this.eventBus.publishAll(result.events);
  }

  private async findSessionRecord(sessionId: string, sessionRepo: SessionRepositoryPort): Promise<Session> {
    const session = await sessionRepo.findById(sessionId);
    if (!session) throw new SessionNotFoundException();

    return session;
  }

  private async findUserById(userId: string, userRepo: UserRepositoryPort): Promise<User> {
    const user = await userRepo.findById(userId);
    if (!user) throw new UserNotFoundException();

    return user;
  }

  private async performLogout(user: User, session: Session): Promise<void> {
    const { ipAddress, userAgent } = this.requestContext.get();
    const ua = userAgent && userAgent.length > 50 ? `${userAgent.substring(0, 50)}...` : userAgent;
    const reason = `User-initiated logout (IP: ${ipAddress}, UA: ${ua}...)`;

    session.revoke(reason);
    user.logout();
  }

  private logLogoutStart(): void {
    this.logger.debug({
      context: "LogoutUseCase",
      event: "LOGOUT_STARTED",
      message: "Logout process started",
    });
  }

  private logSuccessfulLogout(userId: string, sessionId: string, startTime: number): void {
    this.logger.info({
      context: "LogoutUseCase",
      event: "LOGOUT_SUCCESSFUL",
      message: `User logged out successfully`,
      userId,
      sessionId,
      durationMs: Date.now() - startTime,
    });
  }
}
