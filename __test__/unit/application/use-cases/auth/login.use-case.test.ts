import { LoginUseCase } from "@/application/use-cases/auth/login.use-case";
import { LoginCommand } from "@/application/ports/driving/login.use-case.port";
import { User } from "@/domain/entities/user.entity";
import { Session } from "@/domain/entities/session.entity";
import { PasswordHasherPort } from "@/application/ports/driven/password-hasher.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { UnitOfWorkPort, UnitOfWorkRepositories } from "@/application/ports/driven/unit-of-work.port";
import { DomainEvent } from "@/domain/types/domain-event.type";
import { SessionFactory } from "@/application/factories/session.factory";
import { LoginSecurityPolicy } from "@/domain/policies/login-security.policy";
import { TimeUtil } from "@/utils/time.util";
import { UserRoleType, UserStatusType } from "@/domain/types/user.type";
import { InvalidCredentialsException } from "@/application/exceptions/auth.exceptions";

jest.mock("@/domain/entities/user.entity");
jest.mock("@/domain/entities/session.entity");
jest.mock("@/utils/time.util");

describe("LoginUseCase", () => {
  let loginUseCase: LoginUseCase;
  let mockLoginSecurityPolicy: jest.Mocked<LoginSecurityPolicy>;
  let mockUnitOfWork: jest.Mocked<UnitOfWorkPort>;
  let mockSessionFactory: jest.Mocked<SessionFactory>;
  let mockPasswordHasher: jest.Mocked<PasswordHasherPort>;
  let mockEventBus: jest.Mocked<EventBusPort>;
  let mockLogger: jest.Mocked<LoggerPort>;

  let mockUser: jest.Mocked<User>;
  let mockSession: jest.Mocked<Session>;

  const mockUserId = "user-123";
  const mockSessionId = "session-123";
  const mockEmail = "test@example.com";
  const mockPassword = "password123";
  const mockHashedPassword = "hashedPassword123";
  const mockAccessToken = "access-token-123";
  const mockRefreshToken = "refresh-token-123";
  const mockMaxLoginAttempts = 5;
  const mockLockDurationMinutes = 30;
  const mockLockDurationMs = 1800000;

  const mockCommand: LoginCommand = {
    email: mockEmail,
    password: mockPassword,
  };

  const mockUserEvents = [{ eventType: "UserLoggedIn" }] as unknown as DomainEvent[];
  const mockSessionEvents = [{ eventType: "SessionCreated" }] as unknown as DomainEvent[];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      getId: jest.fn().mockReturnValue(mockUserId),
      getEmail: jest.fn().mockReturnValue(mockEmail),
      getName: jest.fn().mockReturnValue("Test User"),
      getRole: jest.fn().mockReturnValue(UserRoleType.MEMBER),
      isEmailVerified: jest.fn().mockReturnValue(true),
      getHashedPasswordForAuthentication: jest.fn().mockReturnValue(mockHashedPassword),
      isActive: jest.fn().mockReturnValue(true),
      isAccountLocked: jest.fn().mockReturnValue(false),
      getAccountLockedUntil: jest.fn().mockReturnValue(null),
      getFailedLoginAttempts: jest.fn().mockReturnValue(0),
      getStatus: jest.fn().mockReturnValue(UserStatusType.ACTIVE),
      login: jest.fn(),
      recordFailedLoginAttempt: jest.fn(),
      pullDomainEvents: jest.fn().mockReturnValue(mockUserEvents),
      getEmailVerifiedAt: jest.fn().mockReturnValue(new Date()),
      getPasswordChangedAt: jest.fn().mockReturnValue(null),
      getLastLoginAt: jest.fn().mockReturnValue(null),
      getLastLogoutAt: jest.fn().mockReturnValue(null),
      getAddress: jest.fn().mockReturnValue(null),
      getCreatedAt: jest.fn().mockReturnValue(new Date()),
      getUpdatedAt: jest.fn().mockReturnValue(new Date()),
      isSuspended: jest.fn().mockReturnValue(false),
      isBanned: jest.fn().mockReturnValue(false),
      isInactive: jest.fn().mockReturnValue(false),
      hasRole: jest.fn().mockReturnValue(false),
      isAdmin: jest.fn().mockReturnValue(false),
      isPasswordExpired: jest.fn().mockReturnValue(false),
      getEmailChangedAt: jest.fn().mockReturnValue(null),
      getSuspendedAt: jest.fn().mockReturnValue(null),
      getSuspendReason: jest.fn().mockReturnValue(null),
      getBannedAt: jest.fn().mockReturnValue(null),
      getBannedReason: jest.fn().mockReturnValue(null),
      getRemainingLockoutTime: jest.fn().mockReturnValue(0),
      getLastFailedLoginAt: jest.fn().mockReturnValue(null),
      unlockAccount: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      suspend: jest.fn(),
      ban: jest.fn(),
      assignRole: jest.fn(),
      changeEmail: jest.fn(),
      verifyEmail: jest.fn(),
      changePassword: jest.fn(),
      updateProfile: jest.fn(),
      assertCanAuthenticate: jest.fn(),
      assertCanBeActivated: jest.fn(),
      assertCanModifyProfile: jest.fn(),
      assertCanChangeRole: jest.fn(),
      assertNotSelfAction: jest.fn(),
    } as unknown as jest.Mocked<User>;

    mockSession = {
      getId: jest.fn().mockReturnValue(mockSessionId),
      pullDomainEvents: jest.fn().mockReturnValue(mockSessionEvents),
      getTokenFingerprint: jest.fn(),
      getTokenFamily: jest.fn(),
      getUserId: jest.fn(),
      getExpiresAt: jest.fn(),
      getCreatedAt: jest.fn(),
      getUpdatedAt: jest.fn(),
      getRevokedAt: jest.fn(),
      getRevokeReason: jest.fn(),
      getIpAddress: jest.fn(),
      getDeviceId: jest.fn(),
      getUserAgent: jest.fn(),
      isExpired: jest.fn(),
      isRevoked: jest.fn(),
      revoke: jest.fn(),
    } as unknown as jest.Mocked<Session>;

    mockLoginSecurityPolicy = {
      maxLoginAttempts: mockMaxLoginAttempts,
      accountLockDurationInMinutes: mockLockDurationMinutes,
    } as jest.Mocked<LoginSecurityPolicy>;

    mockUnitOfWork = {
      commit: jest.fn(),
    } as unknown as jest.Mocked<UnitOfWorkPort>;

    mockSessionFactory = {
      build: jest.fn(),
    } as unknown as jest.Mocked<SessionFactory>;

    mockPasswordHasher = {
      hashPassword: jest.fn(),
      comparePassword: jest.fn(),
    } as jest.Mocked<PasswordHasherPort>;

    mockEventBus = {
      publishAll: jest.fn(),
    } as unknown as jest.Mocked<EventBusPort>;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    } as unknown as jest.Mocked<LoggerPort>;

    (TimeUtil.minutesToMs as jest.Mock).mockReturnValue(mockLockDurationMs);

    mockPasswordHasher.comparePassword.mockResolvedValue(true);
    mockSessionFactory.build.mockReturnValue({
      session: mockSession,
      refreshToken: mockRefreshToken,
      accessToken: mockAccessToken,
    });

    mockUnitOfWork.commit.mockImplementation(async (callback) => {
      const repos = {
        userRepository: {
          findByEmail: jest.fn().mockResolvedValue(mockUser),
          update: jest.fn().mockResolvedValue(undefined),
        },
        sessionRepository: {
          insert: jest.fn().mockResolvedValue(undefined),
        },
      } as unknown as UnitOfWorkRepositories;
      return await callback(repos);
    });

    mockEventBus.publishAll.mockResolvedValue(undefined);

    loginUseCase = new LoginUseCase(mockLoginSecurityPolicy, mockUnitOfWork, mockSessionFactory, mockPasswordHasher, mockEventBus, mockLogger);
  });

  describe("execute - successful login", () => {
    it("should successfully login a user with valid credentials", async () => {
      const result = await loginUseCase.execute(mockCommand);

      expect(result).toEqual({
        tokens: {
          accessToken: mockAccessToken,
          refreshToken: mockRefreshToken,
        },
      });

      expect(mockPasswordHasher.comparePassword).toHaveBeenCalledWith(mockPassword, mockHashedPassword);
      expect(mockUser.login).toHaveBeenCalled();
      expect(mockSessionFactory.build).toHaveBeenCalledWith(mockUser);
      expect(mockUnitOfWork.commit).toHaveBeenCalled();
      expect(mockEventBus.publishAll).toHaveBeenCalledWith([...mockUserEvents, ...mockSessionEvents]);
    });

    it("should log login start and success", async () => {
      await loginUseCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "LoginUseCase",
        event: "LOGIN_STARTED",
        message: "Login started for",
        data: { email: mockEmail },
      });

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "LoginUseCase",
        event: "LOGIN_SUCCESSFUL",
        message: "User logged in successfully",
        userId: mockUserId,
        sessionId: mockSessionId,
        durationMs: expect.any(Number),
        data: {
          email: mockEmail,
          role: UserRoleType.MEMBER,
          isEmailVerified: true,
        },
      });
    });

    it("should publish all domain events from user and session", async () => {
      const userEvents = [{ eventType: "UserLoggedIn" }] as unknown as DomainEvent[];
      const sessionEvents = [{ eventType: "SessionCreated" }] as unknown as DomainEvent[];

      mockUser.pullDomainEvents.mockReturnValueOnce(userEvents);
      mockSession.pullDomainEvents.mockReturnValueOnce(sessionEvents);

      await loginUseCase.execute(mockCommand);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith([...userEvents, ...sessionEvents]);
    });

    it("should calculate duration correctly", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      const startTime = 1000;
      const endTime = 1150;
      dateNowSpy.mockReturnValueOnce(startTime);
      dateNowSpy.mockReturnValueOnce(endTime);

      await loginUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: 150,
        }),
      );

      dateNowSpy.mockRestore();
    });

    it("should handle empty domain events", async () => {
      mockUser.pullDomainEvents.mockReturnValue([]);
      mockSession.pullDomainEvents.mockReturnValue([]);

      await loginUseCase.execute(mockCommand);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith([]);
    });

    it("should read max login attempts from policy", () => {
      expect(loginUseCase["maxLoginAttempts"]).toBe(mockMaxLoginAttempts);
    });

    it("should read account lock duration from policy and convert to ms", () => {
      expect(TimeUtil.minutesToMs).toHaveBeenCalledWith(mockLockDurationMinutes);
      expect(loginUseCase["accountLockDurationInMs"]).toBe(mockLockDurationMs);
    });

    it("should handle user with unverified email", async () => {
      mockUser.isEmailVerified.mockReturnValue(false);

      const result = await loginUseCase.execute(mockCommand);

      expect(result).toEqual({
        tokens: {
          accessToken: mockAccessToken,
          refreshToken: mockRefreshToken,
        },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            email: mockEmail,
            role: UserRoleType.MEMBER,
            isEmailVerified: false,
          },
        }),
      );
    });

    it("should handle user with null email verified status", async () => {
      mockUser.isEmailVerified.mockReturnValue(false);
      mockUser.getEmailVerifiedAt.mockReturnValue(null);

      await loginUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            email: mockEmail,
            role: UserRoleType.MEMBER,
            isEmailVerified: false,
          },
        }),
      );
    });
  });

  describe("execute - user not found", () => {
    it("should throw InvalidCredentialsException when user is not found", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(loginUseCase.execute(mockCommand)).rejects.toBeInstanceOf(InvalidCredentialsException);
      expect(mockUser.login).not.toHaveBeenCalled();
    });

    it("should handle case-sensitive email lookup", async () => {
      const commandWithUppercase: LoginCommand = {
        email: "TEST@EXAMPLE.COM",
        password: mockPassword,
      };

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(loginUseCase.execute(commandWithUppercase)).rejects.toBeInstanceOf(InvalidCredentialsException);
    });

    it("should handle email with whitespace", async () => {
      const commandWithWhitespace: LoginCommand = {
        email: " test@example.com ",
        password: mockPassword,
      };

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(loginUseCase.execute(commandWithWhitespace)).rejects.toBeInstanceOf(InvalidCredentialsException);
    });
  });

  describe("execute - invalid password", () => {
    it("should throw InvalidCredentialsException and record failed attempt on wrong password", async () => {
      mockPasswordHasher.comparePassword.mockResolvedValue(false);

      const failedLoginEvents = [{ eventType: "FailedLoginAttemptRecorded" }] as unknown as DomainEvent[];
      mockUser.recordFailedLoginAttempt.mockImplementation(() => {
        mockUser.pullDomainEvents.mockReturnValue(failedLoginEvents);
      });

      await expect(loginUseCase.execute(mockCommand)).rejects.toBeInstanceOf(InvalidCredentialsException);

      expect(mockUser.recordFailedLoginAttempt).toHaveBeenCalledWith(mockMaxLoginAttempts, mockLockDurationMs);
      expect(mockUser.login).not.toHaveBeenCalled();
      expect(mockSessionFactory.build).not.toHaveBeenCalled();
    });

    it("should publish failed login events when account becomes locked", async () => {
      mockPasswordHasher.comparePassword.mockResolvedValue(false);

      const lockEvents = [{ eventType: "UserAccountLocked" }] as unknown as DomainEvent[];
      mockUser.recordFailedLoginAttempt.mockImplementation(() => {
        mockUser.isAccountLocked.mockReturnValue(true);
        mockUser.pullDomainEvents.mockReturnValue(lockEvents);
      });

      await expect(loginUseCase.execute(mockCommand)).rejects.toThrow();

      expect(mockEventBus.publishAll).toHaveBeenCalledWith(lockEvents);
    });

    it("should not publish events if user has no domain events after failed attempt", async () => {
      mockPasswordHasher.comparePassword.mockResolvedValue(false);
      mockUser.pullDomainEvents.mockReturnValue([]);

      await expect(loginUseCase.execute(mockCommand)).rejects.toThrow();

      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });

    it("should log warning when failed login events publication fails", async () => {
      mockPasswordHasher.comparePassword.mockResolvedValue(false);

      const failedLoginEvents = [{ eventType: "FailedLoginAttemptRecorded" }] as unknown as DomainEvent[];
      mockUser.recordFailedLoginAttempt.mockImplementation(() => {
        mockUser.pullDomainEvents.mockReturnValue(failedLoginEvents);
        mockUser.isAccountLocked.mockReturnValue(true);
      });

      const eventBusError = new Error("Event bus failed");
      mockEventBus.publishAll.mockRejectedValueOnce(eventBusError);

      await expect(loginUseCase.execute(mockCommand)).rejects.toThrow();

      expect(mockLogger.warn).toHaveBeenCalledWith({
        context: "LoginUseCase",
        event: "FAILED_TO_PUBLISH_FAILED_LOGIN_EVENTS",
        message: "Failed to publish failed login events",
        data: { error: eventBusError },
      });
    });

    it("should record failed attempt with correct parameters", async () => {
      mockPasswordHasher.comparePassword.mockResolvedValue(false);

      await expect(loginUseCase.execute(mockCommand)).rejects.toThrow();

      expect(mockUser.recordFailedLoginAttempt).toHaveBeenCalledWith(mockMaxLoginAttempts, mockLockDurationMs);
    });

    it("should handle empty password", async () => {
      const commandWithEmptyPassword: LoginCommand = {
        email: mockEmail,
        password: "",
      };

      mockPasswordHasher.comparePassword.mockResolvedValue(false);

      await expect(loginUseCase.execute(commandWithEmptyPassword)).rejects.toThrow();
      expect(mockUser.recordFailedLoginAttempt).toHaveBeenCalled();
    });
  });

  describe("transaction handling", () => {
    it("should execute all operations within a transaction", async () => {
      await loginUseCase.execute(mockCommand);

      expect(mockUnitOfWork.commit).toHaveBeenCalledTimes(1);
    });

    it("should pass correct repositories to transaction operation", async () => {
      let capturedRepos;

      mockUnitOfWork.commit.mockImplementation(async (operation) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;

        capturedRepos = repos;

        return operation(repos);
      });

      await loginUseCase.execute(mockCommand);

      expect(mockUnitOfWork.commit).toHaveBeenCalledTimes(1);
      expect(capturedRepos).toBeDefined();
    });

    it("should rollback transaction on error", async () => {
      const error = new Error("Transaction failed");
      mockUnitOfWork.commit.mockRejectedValue(error);

      await expect(loginUseCase.execute(mockCommand)).rejects.toThrow("Transaction failed");
    });

    it("should handle repository update error", async () => {
      const error = new Error("Update failed");
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockRejectedValue(error),
          },
          sessionRepository: {
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(loginUseCase.execute(mockCommand)).rejects.toThrow("Update failed");
    });

    it("should handle session insert error", async () => {
      const error = new Error("Session insert failed");
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            insert: jest.fn().mockRejectedValue(error),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(loginUseCase.execute(mockCommand)).rejects.toThrow("Session insert failed");
    });
  });

  describe("error handling", () => {
    it("should handle user repository error during commit", async () => {
      const error = new Error("Repository error");
      mockUnitOfWork.commit.mockRejectedValue(error);

      await expect(loginUseCase.execute(mockCommand)).rejects.toThrow("Repository error");
    });

    it("should handle session factory error", async () => {
      const error = new Error("Session factory failed");
      mockSessionFactory.build.mockImplementation(() => {
        throw error;
      });

      await expect(loginUseCase.execute(mockCommand)).rejects.toThrow("Session factory failed");
    });

    it("should handle event bus error during successful login", async () => {
      const error = new Error("Event bus failed");
      mockEventBus.publishAll.mockRejectedValue(error);

      await expect(loginUseCase.execute(mockCommand)).rejects.toThrow("Event bus failed");
    });

    it("should handle hash provider error", async () => {
      const error = new Error("Hash comparison failed");
      mockPasswordHasher.comparePassword.mockRejectedValue(error);

      await expect(loginUseCase.execute(mockCommand)).rejects.toThrow("Hash comparison failed");
    });

    it("should not publish events when login fails due to invalid password", async () => {
      mockPasswordHasher.comparePassword.mockResolvedValue(false);

      await expect(loginUseCase.execute(mockCommand)).rejects.toThrow();

      expect(mockUser.login).not.toHaveBeenCalled();
    });
  });

  describe("logging scenarios", () => {
    it("should log debug with email", async () => {
      await loginUseCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "LoginUseCase",
        event: "LOGIN_STARTED",
        message: "Login started for",
        data: { email: mockEmail },
      });
    });

    it("should log info with user details", async () => {
      await loginUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "LoginUseCase",
        event: "LOGIN_SUCCESSFUL",
        message: "User logged in successfully",
        userId: mockUserId,
        sessionId: mockSessionId,
        durationMs: expect.any(Number),
        data: {
          email: mockEmail,
          role: UserRoleType.MEMBER,
          isEmailVerified: true,
        },
      });
    });

    it("should not log info when login fails", async () => {
      mockPasswordHasher.comparePassword.mockResolvedValue(false);

      await expect(loginUseCase.execute(mockCommand)).rejects.toThrow();

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should log warning when failed login events publication fails", async () => {
      mockPasswordHasher.comparePassword.mockResolvedValue(false);

      const failedLoginEvents = [{ eventType: "FailedLoginAttemptRecorded" }] as unknown as DomainEvent[];
      mockUser.recordFailedLoginAttempt.mockImplementation(() => {
        mockUser.isAccountLocked.mockReturnValue(true);
        mockUser.pullDomainEvents.mockReturnValue(failedLoginEvents);
      });

      const eventBusError = new Error("Event bus failed");
      mockEventBus.publishAll.mockRejectedValueOnce(eventBusError);

      await expect(loginUseCase.execute(mockCommand)).rejects.toThrow();

      expect(mockLogger.warn).toHaveBeenCalledWith({
        context: "LoginUseCase",
        event: "FAILED_TO_PUBLISH_FAILED_LOGIN_EVENTS",
        message: "Failed to publish failed login events",
        data: { error: eventBusError },
      });
    });

    it("should handle logger error gracefully", async () => {
      mockLogger.debug.mockImplementation(() => {
        throw new Error("Logger error");
      });

      await expect(loginUseCase.execute(mockCommand)).rejects.toThrow("Logger error");
    });
  });

  describe("edge cases", () => {
    it("should handle very long email", async () => {
      const longEmail = "a".repeat(50) + "@" + "b".repeat(50) + ".com";
      const commandWithLongEmail: LoginCommand = {
        email: longEmail,
        password: mockPassword,
      };

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(loginUseCase.execute(commandWithLongEmail)).rejects.toThrow();
    });

    it("should handle user with undefined role", async () => {
      mockUser.getRole.mockReturnValue(undefined as unknown as UserRoleType);

      await loginUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            email: mockEmail,
            role: undefined,
            isEmailVerified: true,
          },
        }),
      );
    });

    it("should handle user with null email", async () => {
      mockUser.getEmail.mockReturnValue(null as unknown as string);

      await loginUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            email: null,
            role: UserRoleType.MEMBER,
            isEmailVerified: true,
          },
        }),
      );
    });

    it("should handle session with no domain events", async () => {
      mockSession.pullDomainEvents.mockReturnValue([]);

      await loginUseCase.execute(mockCommand);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith(mockUserEvents);
    });

    it("should handle user with no domain events", async () => {
      mockUser.pullDomainEvents.mockReturnValue([]);

      await loginUseCase.execute(mockCommand);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith(mockSessionEvents);
    });
  });

  describe("policy configuration", () => {
    it("should use maxLoginAttempts from policy", () => {
      const customMaxAttempts = 3;
      mockLoginSecurityPolicy.maxLoginAttempts = customMaxAttempts;

      const useCase = new LoginUseCase(mockLoginSecurityPolicy, mockUnitOfWork, mockSessionFactory, mockPasswordHasher, mockEventBus, mockLogger);

      expect(useCase["maxLoginAttempts"]).toBe(customMaxAttempts);
    });

    it("should use accountLockDuration from policy", () => {
      const customLockMinutes = 60;
      mockLoginSecurityPolicy.accountLockDurationInMinutes = customLockMinutes;

      new LoginUseCase(mockLoginSecurityPolicy, mockUnitOfWork, mockSessionFactory, mockPasswordHasher, mockEventBus, mockLogger);

      expect(TimeUtil.minutesToMs).toHaveBeenCalledWith(customLockMinutes);
    });

    it("should handle zero lock duration", () => {
      mockLoginSecurityPolicy.accountLockDurationInMinutes = 0;
      (TimeUtil.minutesToMs as jest.Mock).mockReturnValue(0);

      const useCase = new LoginUseCase(mockLoginSecurityPolicy, mockUnitOfWork, mockSessionFactory, mockPasswordHasher, mockEventBus, mockLogger);

      expect(useCase["accountLockDurationInMs"]).toBe(0);
    });

    it("should handle zero max login attempts", () => {
      mockLoginSecurityPolicy.maxLoginAttempts = 0;

      const useCase = new LoginUseCase(mockLoginSecurityPolicy, mockUnitOfWork, mockSessionFactory, mockPasswordHasher, mockEventBus, mockLogger);

      expect(useCase["maxLoginAttempts"]).toBe(0);
    });
  });

  describe("session creation", () => {
    it("should create session with correct parameters", async () => {
      await loginUseCase.execute(mockCommand);

      expect(mockSessionFactory.build).toHaveBeenCalledWith(mockUser);
    });

    it("should include session in transaction", async () => {
      let sessionInserted = false;

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            insert: jest.fn().mockImplementation(() => {
              sessionInserted = true;
              return Promise.resolve();
            }),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await loginUseCase.execute(mockCommand);

      expect(sessionInserted).toBe(true);
    });

    it("should return both access and refresh tokens", async () => {
      const result = await loginUseCase.execute(mockCommand);

      expect(result.tokens.accessToken).toBe(mockAccessToken);
      expect(result.tokens.refreshToken).toBe(mockRefreshToken);
    });
  });

  describe("authentication validation", () => {
    it("should validate password against stored hash", async () => {
      await loginUseCase.execute(mockCommand);

      expect(mockPasswordHasher.comparePassword).toHaveBeenCalledWith(mockPassword, mockHashedPassword);
    });

    it("should not call login when password is invalid", async () => {
      mockPasswordHasher.comparePassword.mockResolvedValue(false);

      await expect(loginUseCase.execute(mockCommand)).rejects.toThrow();

      expect(mockUser.login).not.toHaveBeenCalled();
    });

    it("should not create session when password is invalid", async () => {
      mockPasswordHasher.comparePassword.mockResolvedValue(false);

      await expect(loginUseCase.execute(mockCommand)).rejects.toThrow();

      expect(mockSessionFactory.build).not.toHaveBeenCalled();
    });
  });

  describe("event publishing", () => {
    it("should publish events after successful transaction", async () => {
      const userEvents = [{ eventType: "UserLoggedIn" }] as unknown as DomainEvent[];
      const sessionEvents = [{ eventType: "SessionCreated" }] as unknown as DomainEvent[];

      mockUser.pullDomainEvents.mockReturnValue(userEvents);
      mockSession.pullDomainEvents.mockReturnValue(sessionEvents);

      await loginUseCase.execute(mockCommand);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith([...userEvents, ...sessionEvents]);
    });

    it("should publish events even if event bus fails (error will propagate)", async () => {
      const error = new Error("Event bus error");
      mockEventBus.publishAll.mockRejectedValue(error);

      await expect(loginUseCase.execute(mockCommand)).rejects.toThrow("Event bus error");
    });

    it("should not publish failed login events when user not found", async () => {
      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: {
            findByEmail: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue(undefined),
          },
          sessionRepository: {
            insert: jest.fn().mockResolvedValue(undefined),
          },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await expect(loginUseCase.execute(mockCommand)).rejects.toThrow();

      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });
  });
});
