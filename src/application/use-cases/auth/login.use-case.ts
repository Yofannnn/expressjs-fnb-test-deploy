import { LoginCommand, LoginResult, LoginUseCasePort } from "@/application/ports/driving/login.use-case.port";
import { User } from "@/domain/entities/user.entity";
import { UserRepositoryPort } from "@/application/ports/driven/user.repository.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { UnitOfWorkPort } from "@/application/ports/driven/unit-of-work.port";
import { DomainEvent } from "@/domain/types/domain-event.type";
import { SessionFactory } from "@/application/factories/session.factory";
import { LoginSecurityPolicy } from "@/domain/policies/login-security.policy";
import { InvalidCredentialsException } from "@/application/exceptions/auth.exceptions";
import { PasswordHasherPort } from "@/application/ports/driven/password-hasher.port";
import { TimeUtil } from "@/utils/time.util";

export class LoginUseCase implements LoginUseCasePort {
  private readonly maxLoginAttempts: number;
  private readonly accountLockDurationInMs: number;

  constructor(
    private readonly loginSecurityPolicy: LoginSecurityPolicy,
    private readonly uow: UnitOfWorkPort,
    private readonly sessionFactory: SessionFactory,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly eventBus: EventBusPort,
    private readonly logger: LoggerPort,
  ) {
    this.maxLoginAttempts = this.loginSecurityPolicy.maxLoginAttempts;
    this.accountLockDurationInMs = TimeUtil.minutesToMs(this.loginSecurityPolicy.accountLockDurationInMinutes);
  }

  async execute(command: LoginCommand): Promise<LoginResult> {
    const startTime = Date.now();

    this.logLoginStart(command.email);

    const failedLoginEvents: DomainEvent[] = [];

    try {
      const result = await this.uow.commit(async (repos) => {
        const user = await this.findUserByEmail(command.email, repos.userRepository);
        await this.validatePassword(command.password, user, repos.userRepository, failedLoginEvents);

        user.login();
        await repos.userRepository.update(user);

        const { session, refreshToken, accessToken } = this.sessionFactory.build(user);
        await repos.sessionRepository.insert(session);

        const events = [...user.pullDomainEvents(), ...session.pullDomainEvents()];

        return { authToken: { accessToken, refreshToken }, user, session, events };
      });

      this.logSuccessfulLogin(result.user, result.session.getId(), startTime);

      await this.eventBus.publishAll(result.events);

      return { tokens: result.authToken };
    } catch (error) {
      if (failedLoginEvents.length) {
        await this.eventBus.publishAll(failedLoginEvents).catch((error) => {
          this.logger.warn({
            context: "LoginUseCase",
            event: "FAILED_TO_PUBLISH_FAILED_LOGIN_EVENTS",
            message: "Failed to publish failed login events",
            data: { error },
          });
        });
      }
      throw error;
    }
  }

  private async findUserByEmail(email: string, userRepository: UserRepositoryPort): Promise<User> {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new InvalidCredentialsException();

    return user;
  }

  private async validatePassword(password: string, user: User, userRepository: UserRepositoryPort, failedLoginEvents: DomainEvent[]): Promise<void> {
    const isPasswordValid = await this.passwordHasher.comparePassword(password, user.getHashedPasswordForAuthentication());

    if (!isPasswordValid) {
      user.recordFailedLoginAttempt(this.maxLoginAttempts, this.accountLockDurationInMs);
      await userRepository.update(user);

      if (user.isAccountLocked()) {
        user.pullDomainEvents().forEach((event) => failedLoginEvents.push(event));
      }

      throw new InvalidCredentialsException();
    }
  }

  private logLoginStart(email: string): void {
    this.logger.debug({
      context: "LoginUseCase",
      event: "LOGIN_STARTED",
      message: "Login started for",
      data: { email },
    });
  }

  private logSuccessfulLogin(user: User, sessionId: string, startTime: number): void {
    this.logger.info({
      context: "LoginUseCase",
      event: "LOGIN_SUCCESSFUL",
      message: `User logged in successfully`,
      userId: user.getId(),
      sessionId: sessionId,
      durationMs: Date.now() - startTime,
      data: {
        email: user.getEmail(),
        role: user.getRole(),
        isEmailVerified: user.isEmailVerified(),
      },
    });
  }
}
