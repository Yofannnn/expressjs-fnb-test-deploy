import { RegisterUseCase } from "@/application/use-cases/auth/register.use-case";
import { RegisterCommand } from "@/application/ports/driving/register.use-case.port";
import { PasswordHasherPort } from "@/application/ports/driven/password-hasher.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { EventBusPort } from "@/application/ports/driven/event-bus.port";
import { UnitOfWorkPort, UnitOfWorkRepositories } from "@/application/ports/driven/unit-of-work.port";
import { IdGeneratorPort } from "@/application/ports/driven/id-generator.port";
import { SessionFactory } from "@/application/factories/session.factory";
import { ApplicationTokenFactory } from "@/application/factories/application-token.factory";
import { User } from "@/domain/entities/user.entity";
import { Session } from "@/domain/entities/session.entity";
import { VerificationEmailToken } from "@/domain/entities/application-token.entity";
import { UserRoleType } from "@/domain/types/user.type";
import { DomainEvent } from "@/domain/types/domain-event.type";

jest.mock("@/domain/entities/user.entity");
jest.mock("@/domain/entities/session.entity");
jest.mock("@/domain/entities/application-token.entity");

describe("RegisterUseCase", () => {
  let registerUseCase: RegisterUseCase;
  let mockUnitOfWork: jest.Mocked<UnitOfWorkPort>;
  let mockSessionFactory: jest.Mocked<SessionFactory>;
  let mockApplicationTokenFactory: jest.Mocked<ApplicationTokenFactory>;
  let mockPasswordHasher: jest.Mocked<PasswordHasherPort>;
  let mockIdGenerator: jest.Mocked<IdGeneratorPort>;
  let mockEventBus: jest.Mocked<EventBusPort>;
  let mockLogger: jest.Mocked<LoggerPort>;

  let mockUser: jest.Mocked<User>;
  let mockSession: jest.Mocked<Session>;
  let mockVerificationToken: jest.Mocked<VerificationEmailToken>;

  const mockUserId = "user-123";
  const mockSessionId = "session-123";
  const mockTokenId = "token-123";
  const mockHashedPassword = "hashed-password-123";
  const mockAccessToken = "access-token-123";
  const mockRefreshToken = "refresh-token-123";

  const mockCommand: RegisterCommand = {
    name: "Test User",
    email: "test@example.com",
    password: "SecurePass123!",
    address: "123 Main St",
  };

  const mockUserEvents = [{ eventType: "UserCreated" }] as unknown as DomainEvent[];
  const mockSessionEvents = [{ eventType: "SessionCreated" }] as unknown as DomainEvent[];
  const mockTokenEvents = [{ eventType: "VerificationEmailTokenIssued" }] as unknown as DomainEvent[];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      getId: jest.fn().mockReturnValue(mockUserId),
      getEmail: jest.fn().mockReturnValue("test@example.com"),
      getName: jest.fn().mockReturnValue("Test User"),
      getRole: jest.fn().mockReturnValue(UserRoleType.MEMBER),
      pullDomainEvents: jest.fn().mockReturnValue(mockUserEvents),
    } as unknown as jest.Mocked<User>;

    mockSession = {
      getId: jest.fn().mockReturnValue(mockSessionId),
      pullDomainEvents: jest.fn().mockReturnValue(mockSessionEvents),
    } as unknown as jest.Mocked<Session>;

    mockVerificationToken = {
      getId: jest.fn().mockReturnValue(mockTokenId),
      pullDomainEvents: jest.fn().mockReturnValue(mockTokenEvents),
    } as unknown as jest.Mocked<VerificationEmailToken>;

    mockUnitOfWork = {
      commit: jest.fn(),
    } as unknown as jest.Mocked<UnitOfWorkPort>;

    mockSessionFactory = {
      build: jest.fn(),
    } as unknown as jest.Mocked<SessionFactory>;

    mockApplicationTokenFactory = {
      issueVerificationEmail: jest.fn(),
    } as unknown as jest.Mocked<ApplicationTokenFactory>;

    mockPasswordHasher = {
      hashPassword: jest.fn(),
      comparePassword: jest.fn(),
    };

    mockIdGenerator = {
      generate: jest.fn(),
    };

    mockEventBus = {
      publishAll: jest.fn(),
      publish: jest.fn(),
    };

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    };

    mockIdGenerator.generate.mockReturnValue(mockUserId);
    mockPasswordHasher.hashPassword.mockResolvedValue(mockHashedPassword);
    mockSessionFactory.build.mockReturnValue({
      session: mockSession,
      refreshToken: mockRefreshToken,
      accessToken: mockAccessToken,
    });
    mockApplicationTokenFactory.issueVerificationEmail.mockReturnValue(mockVerificationToken);

    mockUnitOfWork.commit.mockImplementation(async (callback) => {
      const repos = {
        userRepository: {
          insert: jest.fn().mockResolvedValue(undefined),
        },
        sessionRepository: {
          insert: jest.fn().mockResolvedValue(undefined),
        },
        applicationTokenRepository: {
          insert: jest.fn().mockResolvedValue(undefined),
        },
      } as unknown as UnitOfWorkRepositories;
      return await callback(repos);
    });

    mockEventBus.publishAll.mockResolvedValue(undefined);

    (User.create as jest.Mock).mockReturnValue(mockUser);
    (Session.create as jest.Mock).mockReturnValue(mockSession);
    (VerificationEmailToken.issue as jest.Mock).mockReturnValue(mockVerificationToken);

    registerUseCase = new RegisterUseCase(
      mockUnitOfWork,
      mockSessionFactory,
      mockApplicationTokenFactory,
      mockPasswordHasher,
      mockIdGenerator,
      mockEventBus,
      mockLogger,
    );
  });

  describe("execute - successful registration", () => {
    it("should successfully register a new user", async () => {
      const result = await registerUseCase.execute(mockCommand);

      expect(result).toEqual({
        tokens: {
          accessToken: mockAccessToken,
          refreshToken: mockRefreshToken,
        },
      });

      expect(mockIdGenerator.generate).toHaveBeenCalled();
      expect(mockPasswordHasher.hashPassword).toHaveBeenCalledWith("SecurePass123!");
      expect(User.create).toHaveBeenCalledWith({
        id: mockUserId,
        name: "Test User",
        email: "test@example.com",
        address: "123 Main St",
        hashedPassword: mockHashedPassword,
        role: UserRoleType.MEMBER,
      });

      expect(mockSessionFactory.build).toHaveBeenCalledWith(mockUser);
      expect(mockApplicationTokenFactory.issueVerificationEmail).toHaveBeenCalledWith(mockUser);

      expect(mockUnitOfWork.commit).toHaveBeenCalled();
      expect(mockEventBus.publishAll).toHaveBeenCalledWith([...mockUserEvents, ...mockSessionEvents, ...mockTokenEvents]);
    });

    it("should log registration start and success", async () => {
      await registerUseCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "RegisterUseCase",
        event: "REGISTER_STARTED",
        message: "Registration started for",
        data: { email: "test@example.com" },
      });

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "RegisterUseCase",
        event: "REGISTER_SUCCESSFUL",
        message: "User registered successfully",
        userId: mockUserId,
        sessionId: mockSessionId,
        durationMs: expect.any(Number),
        data: { role: UserRoleType.MEMBER },
      });
    });

    it("should create user with MEMBER role by default", async () => {
      await registerUseCase.execute(mockCommand);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRoleType.MEMBER,
        }),
      );
    });

    it("should handle user without address", async () => {
      const commandWithoutAddress: RegisterCommand = {
        name: "Test User",
        email: "test@example.com",
        password: "SecurePass123!",
      };

      await registerUseCase.execute(commandWithoutAddress);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          address: undefined,
        }),
      );
    });

    it("should handle empty address string", async () => {
      const commandWithEmptyAddress: RegisterCommand = {
        name: "Test User",
        email: "test@example.com",
        password: "SecurePass123!",
        address: "",
      };

      await registerUseCase.execute(commandWithEmptyAddress);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          address: "",
        }),
      );
    });

    it("should publish all domain events from user, session, and verification token", async () => {
      const userEvents = [{ eventType: "UserCreated", payload: { userId: mockUserId } }] as unknown as DomainEvent[];
      const sessionEvents = [{ eventType: "SessionCreated", payload: { sessionId: mockSessionId } }] as unknown as DomainEvent[];
      const tokenEvents = [{ eventType: "VerificationEmailTokenIssued", payload: { tokenId: mockTokenId } }] as unknown as DomainEvent[];

      mockUser.pullDomainEvents.mockReturnValue(userEvents);
      mockSession.pullDomainEvents.mockReturnValue(sessionEvents);
      mockVerificationToken.pullDomainEvents.mockReturnValue(tokenEvents);

      await registerUseCase.execute(mockCommand);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith([...userEvents, ...sessionEvents, ...tokenEvents]);
    });

    it("should handle empty domain events", async () => {
      mockUser.pullDomainEvents.mockReturnValue([]);
      mockSession.pullDomainEvents.mockReturnValue([]);
      mockVerificationToken.pullDomainEvents.mockReturnValue([]);

      await registerUseCase.execute(mockCommand);

      expect(mockEventBus.publishAll).toHaveBeenCalledWith([]);
    });

    it("should calculate duration correctly", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      const startTime = 1000;
      const endTime = 1150;
      dateNowSpy.mockReturnValueOnce(startTime);
      dateNowSpy.mockReturnValueOnce(endTime);

      await registerUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: 150,
        }),
      );

      dateNowSpy.mockRestore();
    });

    it("should emit events after logging success", async () => {
      let logCalled = false;
      let publishCalled = false;

      mockLogger.info.mockImplementation(() => {
        logCalled = true;
        expect(publishCalled).toBe(false);
        return undefined;
      });

      mockEventBus.publishAll.mockImplementation(() => {
        publishCalled = true;
        expect(logCalled).toBe(true);
        return Promise.resolve();
      });

      await registerUseCase.execute(mockCommand);

      expect(logCalled).toBe(true);
      expect(publishCalled).toBe(true);
    });
  });

  describe("execute - error handling", () => {
    it("should throw error when email already exists (duplicate constraint)", async () => {
      const duplicateError = {
        code: "23505",
        constraint: "users_email_unique",
        message: "Duplicate key violation",
      } as unknown as Error;

      mockUnitOfWork.commit.mockRejectedValue(duplicateError);

      await expect(registerUseCase.execute(mockCommand)).rejects.toEqual(duplicateError);
      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });

    it("should throw error when password hashing fails", async () => {
      const hashError = new Error("Hashing failed");
      mockPasswordHasher.hashPassword.mockRejectedValue(hashError);

      await expect(registerUseCase.execute(mockCommand)).rejects.toThrow("Hashing failed");
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
    });

    it("should throw error when application token factory fails", async () => {
      const tokenError = new Error("Token factory failed");
      mockApplicationTokenFactory.issueVerificationEmail.mockImplementation(() => {
        throw tokenError;
      });

      await expect(registerUseCase.execute(mockCommand)).rejects.toThrow("Token factory failed");
      expect(mockUnitOfWork.commit).not.toHaveBeenCalled();
    });

    it("should throw error when user repository insert fails", async () => {
      const insertError = new Error("Insert failed");
      mockUnitOfWork.commit.mockImplementation(async () => {
        throw insertError;
      });

      await expect(registerUseCase.execute(mockCommand)).rejects.toThrow("Insert failed");
      expect(mockEventBus.publishAll).not.toHaveBeenCalled();
    });

    it("should throw error when event bus fails", async () => {
      const eventBusError = new Error("Event bus failed");
      mockEventBus.publishAll.mockRejectedValue(eventBusError);

      await expect(registerUseCase.execute(mockCommand)).rejects.toThrow("Event bus failed");
    });

    it("should handle null response from idGenerator", async () => {
      mockIdGenerator.generate.mockReturnValue(null as unknown as string);

      await registerUseCase.execute(mockCommand);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: null,
        }),
      );
    });

    it("should handle special characters in name", async () => {
      const commandWithSpecialChars: RegisterCommand = {
        name: "John Doe Jr. 🚀",
        email: "john@example.com",
        password: "SecurePass123!",
        address: "123 Main St",
      };

      await registerUseCase.execute(commandWithSpecialChars);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "John Doe Jr. 🚀",
        }),
      );
    });

    it("should handle very long email addresses", async () => {
      const longEmail = "a".repeat(50) + "@" + "b".repeat(50) + ".com";
      const commandWithLongEmail: RegisterCommand = {
        name: "Test User",
        email: longEmail,
        password: "SecurePass123!",
      };

      await registerUseCase.execute(commandWithLongEmail);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: longEmail,
        }),
      );
    });

    it("should handle very long names", async () => {
      const longName = "a".repeat(1000);
      const commandWithLongName: RegisterCommand = {
        name: longName,
        email: "test@example.com",
        password: "SecurePass123!",
      };

      await registerUseCase.execute(commandWithLongName);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: longName,
        }),
      );
    });

    it("should handle missing address in command", async () => {
      const commandWithoutAddress: RegisterCommand = {
        name: "Test User",
        email: "test@example.com",
        password: "SecurePass123!",
      };

      await registerUseCase.execute(commandWithoutAddress);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          address: undefined,
        }),
      );
    });

    it("should handle ID generation failure", async () => {
      const idError = new Error("ID generation failed");
      mockIdGenerator.generate.mockImplementation(() => {
        throw idError;
      });

      await expect(registerUseCase.execute(mockCommand)).rejects.toThrow("ID generation failed");
      expect(mockPasswordHasher.hashPassword).toHaveBeenCalled();
      expect(User.create).not.toHaveBeenCalled();
    });
  });

  describe("transaction handling", () => {
    it("should execute all operations within a transaction", async () => {
      await registerUseCase.execute(mockCommand);

      expect(mockUnitOfWork.commit).toHaveBeenCalledTimes(1);
    });

    it("should pass correct repositories to transaction operation", async () => {
      let capturedRepos;

      mockUnitOfWork.commit.mockImplementation(async (operation) => {
        const repos = {
          userRepository: { insert: jest.fn() },
          sessionRepository: { insert: jest.fn() },
          applicationTokenRepository: { insert: jest.fn() },
        } as unknown as UnitOfWorkRepositories;

        capturedRepos = repos;

        return operation(repos);
      });

      await registerUseCase.execute(mockCommand);

      expect(mockUnitOfWork.commit).toHaveBeenCalledTimes(1);
      expect(capturedRepos).toBeDefined();
    });

    it("should rollback transaction on error", async () => {
      const error = new Error("Transaction failed");
      mockUnitOfWork.commit.mockRejectedValue(error);

      await expect(registerUseCase.execute(mockCommand)).rejects.toThrow("Transaction failed");
    });

    it("should insert all entities in parallel within transaction", async () => {
      const userInsertSpy = jest.fn().mockResolvedValue(undefined);
      const sessionInsertSpy = jest.fn().mockResolvedValue(undefined);
      const tokenInsertSpy = jest.fn().mockResolvedValue(undefined);

      mockUnitOfWork.commit.mockImplementation(async (callback) => {
        const repos = {
          userRepository: { insert: userInsertSpy },
          sessionRepository: { insert: sessionInsertSpy },
          applicationTokenRepository: { insert: tokenInsertSpy },
        } as unknown as UnitOfWorkRepositories;
        return await callback(repos);
      });

      await registerUseCase.execute(mockCommand);

      expect(userInsertSpy).toHaveBeenCalledWith(mockUser);
      expect(sessionInsertSpy).toHaveBeenCalledWith(mockSession);
      expect(tokenInsertSpy).toHaveBeenCalledWith(mockVerificationToken);
    });
  });

  describe("edge cases - null and undefined values", () => {
    it("should handle address as null", async () => {
      const commandWithNullAddress: RegisterCommand = {
        name: "Test User",
        email: "test@example.com",
        password: "SecurePass123!",
        address: null as unknown as string,
      };

      await registerUseCase.execute(commandWithNullAddress);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          address: null,
        }),
      );
    });

    it("should handle name with empty string", async () => {
      const commandWithEmptyName: RegisterCommand = {
        name: "",
        email: "test@example.com",
        password: "SecurePass123!",
      };

      await registerUseCase.execute(commandWithEmptyName);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "",
        }),
      );
    });

    it("should handle email with empty string", async () => {
      const commandWithEmptyEmail: RegisterCommand = {
        name: "Test User",
        email: "",
        password: "SecurePass123!",
      };

      await registerUseCase.execute(commandWithEmptyEmail);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "",
        }),
      );
    });

    it("should handle password with empty string", async () => {
      const commandWithEmptyPassword: RegisterCommand = {
        name: "Test User",
        email: "test@example.com",
        password: "",
      };

      await registerUseCase.execute(commandWithEmptyPassword);

      expect(mockPasswordHasher.hashPassword).toHaveBeenCalledWith("");
    });
  });

  describe("logging scenarios", () => {
    it("should log debug with email", async () => {
      await registerUseCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "RegisterUseCase",
        event: "REGISTER_STARTED",
        message: "Registration started for",
        data: { email: "test@example.com" },
      });
    });

    it("should log info with user ID and session ID", async () => {
      await registerUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "RegisterUseCase",
        event: "REGISTER_SUCCESSFUL",
        message: "User registered successfully",
        userId: mockUserId,
        sessionId: mockSessionId,
        durationMs: expect.any(Number),
        data: { role: UserRoleType.MEMBER },
      });
    });

    it("should not log info when registration fails", async () => {
      mockUnitOfWork.commit.mockRejectedValue(new Error("Registration failed"));

      await expect(registerUseCase.execute(mockCommand)).rejects.toThrow("Registration failed");

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should log correct role in success log", async () => {
      const adminUser = {
        ...mockUser,
        getRole: jest.fn().mockReturnValue(UserRoleType.ADMIN),
      };
      (User.create as jest.Mock).mockReturnValue(adminUser);

      await registerUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { role: UserRoleType.ADMIN },
        }),
      );
    });

    it("should handle logger debug throwing error", async () => {
      mockLogger.debug.mockImplementation(() => {
        throw new Error("Logger error");
      });

      await expect(registerUseCase.execute(mockCommand)).rejects.toThrow("Logger error");
    });

    it("should handle logger info throwing error", async () => {
      mockLogger.info.mockImplementation(() => {
        throw new Error("Logger error");
      });

      await expect(registerUseCase.execute(mockCommand)).rejects.toThrow("Logger error");
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete registration flow with all dependencies", async () => {
      const result = await registerUseCase.execute(mockCommand);

      expect(result).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBe(mockAccessToken);
      expect(result.tokens.refreshToken).toBe(mockRefreshToken);
    });

    it("should handle multiple registrations with different emails", async () => {
      const command1: RegisterCommand = {
        name: "User 1",
        email: "user1@example.com",
        password: "Pass123!",
      };

      const command2: RegisterCommand = {
        name: "User 2",
        email: "user2@example.com",
        password: "Pass456!",
      };

      const result1 = await registerUseCase.execute(command1);
      const result2 = await registerUseCase.execute(command2);

      expect(result1.tokens).toBeDefined();
      expect(result2.tokens).toBeDefined();
      expect(result1.tokens.accessToken).toBe(mockAccessToken);
      expect(result2.tokens.accessToken).toBe(mockAccessToken);
    });

    it("should handle registration with address containing special characters", async () => {
      const commandWithSpecialAddress: RegisterCommand = {
        name: "Test User",
        email: "test@example.com",
        password: "SecurePass123!",
        address: "123 Main St, Apt #5B, São Paulo, BR 🏠",
      };

      await registerUseCase.execute(commandWithSpecialAddress);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          address: "123 Main St, Apt #5B, São Paulo, BR 🏠",
        }),
      );
    });

    it("should handle registration with Unicode characters in name", async () => {
      const commandWithUnicodeName: RegisterCommand = {
        name: "José María さん",
        email: "test@example.com",
        password: "SecurePass123!",
      };

      await registerUseCase.execute(commandWithUnicodeName);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "José María さん",
        }),
      );
    });

    it("should handle registration with email containing plus sign", async () => {
      const commandWithPlusEmail: RegisterCommand = {
        name: "Test User",
        email: "test+alias@example.com",
        password: "SecurePass123!",
      };

      await registerUseCase.execute(commandWithPlusEmail);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "test+alias@example.com",
        }),
      );
    });
  });

  describe("private method buildUserEntity", () => {
    it("should hash password correctly", async () => {
      await registerUseCase.execute(mockCommand);

      expect(mockPasswordHasher.hashPassword).toHaveBeenCalledWith("SecurePass123!");
    });

    it("should generate ID for user", async () => {
      await registerUseCase.execute(mockCommand);

      expect(mockIdGenerator.generate).toHaveBeenCalled();
    });

    it("should create user with correct data", async () => {
      await registerUseCase.execute(mockCommand);

      expect(User.create).toHaveBeenCalledWith({
        id: mockUserId,
        name: "Test User",
        email: "test@example.com",
        address: "123 Main St",
        hashedPassword: mockHashedPassword,
        role: UserRoleType.MEMBER,
      });
    });

    it("should create user with address as undefined when not provided", async () => {
      const commandWithoutAddress: RegisterCommand = {
        name: "Test User",
        email: "test@example.com",
        password: "SecurePass123!",
      };

      await registerUseCase.execute(commandWithoutAddress);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          address: undefined,
        }),
      );
    });

    it("should create user with address as null when explicitly null", async () => {
      const commandWithNullAddress: RegisterCommand = {
        name: "Test User",
        email: "test@example.com",
        password: "SecurePass123!",
        address: null as unknown as string,
      };

      await registerUseCase.execute(commandWithNullAddress);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          address: null,
        }),
      );
    });
  });

  describe("private method logRegistrationStart", () => {
    it("should log debug message with email", async () => {
      await registerUseCase.execute(mockCommand);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        context: "RegisterUseCase",
        event: "REGISTER_STARTED",
        message: "Registration started for",
        data: { email: "test@example.com" },
      });
    });

    it("should log debug with empty email", async () => {
      const commandWithEmptyEmail: RegisterCommand = {
        name: "Test User",
        email: "",
        password: "SecurePass123!",
      };

      await registerUseCase.execute(commandWithEmptyEmail);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { email: "" },
        }),
      );
    });
  });

  describe("private method logSuccessfulRegistration", () => {
    it("should log info message with user details", async () => {
      await registerUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith({
        context: "RegisterUseCase",
        event: "REGISTER_SUCCESSFUL",
        message: "User registered successfully",
        userId: mockUserId,
        sessionId: mockSessionId,
        durationMs: expect.any(Number),
        data: { role: UserRoleType.MEMBER },
      });
    });

    it("should log info with correct duration", async () => {
      const dateNowSpy = jest.spyOn(Date, "now");
      dateNowSpy.mockReturnValueOnce(1000);
      dateNowSpy.mockReturnValueOnce(1250);

      await registerUseCase.execute(mockCommand);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: 250,
        }),
      );

      dateNowSpy.mockRestore();
    });
  });

  describe("additional coverage scenarios", () => {
    it("should handle user with undefined email", async () => {
      const commandWithUndefinedEmail: RegisterCommand = {
        name: "Test User",
        email: undefined as unknown as string,
        password: "SecurePass123!",
      };

      await registerUseCase.execute(commandWithUndefinedEmail);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: undefined,
        }),
      );
    });

    it("should handle user with undefined name", async () => {
      const commandWithUndefinedName: RegisterCommand = {
        name: undefined as unknown as string,
        email: "test@example.com",
        password: "SecurePass123!",
      };

      await registerUseCase.execute(commandWithUndefinedName);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: undefined,
        }),
      );
    });

    it("should handle user with undefined password", async () => {
      const commandWithUndefinedPassword: RegisterCommand = {
        name: "Test User",
        email: "test@example.com",
        password: undefined as unknown as string,
      };

      await registerUseCase.execute(commandWithUndefinedPassword);

      expect(mockPasswordHasher.hashPassword).toHaveBeenCalledWith(undefined);
    });

    it("should handle multiple parallel registrations", async () => {
      const commands = [
        { name: "User 1", email: "user1@example.com", password: "Pass1!" },
        { name: "User 2", email: "user2@example.com", password: "Pass2!" },
        { name: "User 3", email: "user3@example.com", password: "Pass3!" },
      ];

      const results = await Promise.all(commands.map((cmd) => registerUseCase.execute(cmd)));

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.tokens).toBeDefined();
        expect(result.tokens.accessToken).toBe(mockAccessToken);
        expect(result.tokens.refreshToken).toBe(mockRefreshToken);
      });
    });
  });
});
