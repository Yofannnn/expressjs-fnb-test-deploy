import { RegisterUseCasePort, RegisterCommand, RegisterResult } from "@/application/ports/driving/register.use-case.port";
import { User } from "@/domain/entities/user.entity";
import { UserRoleType } from "@/domain/types/user.type";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { UnitOfWorkPort } from "@/application/ports/driven/unit-of-work.port";
import { IdGeneratorPort } from "@/application/ports/driven/id-generator.port";
import { SessionFactory } from "@/application/factories/session.factory";
import { ApplicationTokenFactory } from "@/application/factories/application-token.factory";
import { PasswordHasherPort } from "@/application/ports/driven/password-hasher.port";

export class RegisterUseCase implements RegisterUseCasePort {
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly sessionFactory: SessionFactory,
    private readonly applicationTokenFactory: ApplicationTokenFactory,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly eventBus: EventBusPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: RegisterCommand): Promise<RegisterResult> {
    const startTime = Date.now();

    this.logRegistrationStart(command.email);

    const user = await this.buildUserEntity(command);
    const { session, refreshToken, accessToken } = this.sessionFactory.build(user);
    const verificationEmail = this.applicationTokenFactory.issueVerificationEmail(user);

    await this.uow.commit(async (repos) => {
      await Promise.all([
        repos.userRepository.insert(user), // Repository catches unique constraint violation (duplicate email) and throws EmailAlreadyExistsException
        repos.sessionRepository.insert(session),
        repos.applicationTokenRepository.insert(verificationEmail),
      ]);
    });

    const events = [...user.pullDomainEvents(), ...session.pullDomainEvents(), ...verificationEmail.pullDomainEvents()];

    this.logSuccessfulRegistration(user, session.getId(), startTime);

    await this.eventBus.publishAll(events);

    return { tokens: { accessToken, refreshToken } };
  }

  private async buildUserEntity(command: RegisterCommand): Promise<User> {
    const hashedPassword = await this.passwordHasher.hashPassword(command.password);
    const newUser = User.create({
      id: this.idGenerator.generate(),
      name: command.name,
      email: command.email,
      address: command.address,
      hashedPassword,
      role: UserRoleType.MEMBER,
    });

    return newUser;
  }

  private logRegistrationStart(email: string): void {
    this.logger.debug({
      context: "RegisterUseCase",
      event: "REGISTER_STARTED",
      message: "Registration started for",
      data: { email },
    });
  }

  private logSuccessfulRegistration(user: User, sessionId: string, startTime: number): void {
    this.logger.info({
      context: "RegisterUseCase",
      event: "REGISTER_SUCCESSFUL",
      message: `User registered successfully`,
      userId: user.getId(),
      sessionId: sessionId,
      durationMs: Date.now() - startTime,
      data: { role: user.getRole() },
    });
  }
}
