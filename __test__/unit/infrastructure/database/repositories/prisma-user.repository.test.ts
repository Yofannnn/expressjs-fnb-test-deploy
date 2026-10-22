import { PrismaUserRepository } from "@/infrastructure/database/repositories/prisma-user.repository";
import { PrismaDatabaseClient } from "@/infrastructure/database/prisma-database-client";
import { PrismaTransactionContext } from "@/infrastructure/database/prisma-transaction-context";
import { Logger } from "@/application/ports/driven/logger";
import { User } from "@/domain/entities/user.entity";
import { UserMapper } from "@/application/mappers/user.mapper";
import { UserRoleType } from "@/domain/types/user-role-type.enum";
import { UserStatusType } from "@/domain/types/user-status-type.enum";
import { TransactionContext } from "@/application/ports/driven/database";
import { AUTH_EXCEPTIONS } from "@/application/exceptions/auth.exceptions";

jest.mock("@/application/mappers/user.mapper");

describe("PrismaUserRepository", () => {
  let repository: PrismaUserRepository;
  let mockLogger: jest.Mocked<Logger>;
  let mockDbClient: jest.Mocked<PrismaDatabaseClient>;
  let mockPrismaClient: jest.Mocked<any>;

  const mockPrismaUser = {
    id: "user-123",
    name: "John Doe",
    address: "123 Main St",
    email: "john@example.com",
    emailChangedAt: new Date("2024-01-01"),
    emailVerifiedAt: new Date("2024-01-02"),
    hashedPassword: "hashed-password-123",
    passwordChangedAt: new Date("2024-01-01"),
    role: "MEMBER",
    status: "ACTIVE",
    bannedAt: null,
    bannedReason: null,
    suspendedAt: null,
    suspendReason: null,
    accountLockedUntil: null,
    failedLoginAttempts: 0,
    lastLogoutAt: null,
    lastLoginAt: new Date("2024-01-15"),
    lastFailedLoginAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
  };

  const mockUserEntity = {
    getId: jest.fn().mockReturnValue("user-123"),
    getEmail: jest.fn().mockReturnValue("john@example.com"),
    getName: jest.fn().mockReturnValue("John Doe"),
    getRole: jest.fn().mockReturnValue(UserRoleType.MEMBER),
    getStatus: jest.fn().mockReturnValue(UserStatusType.ACTIVE),
  } as unknown as User;

  const mockPlainObject = {
    id: "user-123",
    name: "John Doe",
    address: "123 Main St",
    email: "john@example.com",
    hashedPassword: "hashed-password-123",
    role: UserRoleType.MEMBER,
    status: "ACTIVE",
    emailVerifiedAt: new Date("2024-01-02"),
    emailChangedAt: new Date("2024-01-01"),
    passwordChangedAt: new Date("2024-01-01"),
    bannedAt: null,
    bannedReason: null,
    suspendedAt: null,
    suspendReason: null,
    accountLockedUntil: null,
    failedLoginAttempts: 0,
    lastLogoutAt: null,
    lastLoginAt: new Date("2024-01-15"),
    lastFailedLoginAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    } as jest.Mocked<Logger>;

    mockPrismaClient = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    mockDbClient = {
      getPrismaClient: jest.fn().mockReturnValue(mockPrismaClient),
      executeInTransaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaDatabaseClient>;

    (UserMapper.toPlainObject as jest.Mock).mockReturnValue(mockPlainObject);

    jest.spyOn(User, "rebuild").mockReturnValue(mockUserEntity);

    repository = new PrismaUserRepository(mockLogger, mockDbClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with logger and dbClient", () => {
      const repo = new PrismaUserRepository(mockLogger, mockDbClient);
      expect(repo).toBeInstanceOf(PrismaUserRepository);
    });

    it("should initialize with transaction context", () => {
      const mockPrismaTransaction = { user: { findUnique: jest.fn() } } as any;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);
      const repo = new PrismaUserRepository(mockLogger, mockDbClient, txContext);
      expect(repo).toBeInstanceOf(PrismaUserRepository);
    });

    it("should set repositoryName correctly", () => {
      expect((repository as any).repositoryName).toBe("PrismaUserRepository");
    });
  });

  describe("withTransaction", () => {
    it("should create new repository instance with transaction context", () => {
      const mockPrismaTransaction = { user: { findUnique: jest.fn() } } as any;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);
      const txRepo = repository.withTransaction(txContext);
      expect(txRepo).toBeInstanceOf(PrismaUserRepository);
      expect(txRepo).not.toBe(repository);
    });

    it("should throw error for invalid transaction context", () => {
      const invalidTx = {} as TransactionContext;
      expect(() => {
        repository.withTransaction(invalidTx);
      }).toThrow("Invalid transaction context for PrismaUserRepository. Expected PrismaTransactionContext.");
    });
  });

  describe("findById", () => {
    it("should find user by id and return entity", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockPrismaUser);

      const result = await repository.findById("user-123");

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
      });
      expect(User.rebuild).toHaveBeenCalledWith({
        id: "user-123",
        profile: { name: "John Doe", address: "123 Main St" },
        email: {
          address: "john@example.com",
          changedAt: mockPrismaUser.emailChangedAt,
          verifiedAt: mockPrismaUser.emailVerifiedAt,
        },
        password: {
          hashedPassword: "hashed-password-123",
          changedAt: mockPrismaUser.passwordChangedAt,
        },
        role: UserRoleType.MEMBER,
        status: {
          status: "ACTIVE",
          bannedAt: null,
          bannedReason: null,
          suspendedAt: null,
          suspendReason: null,
        },
        security: {
          accountLockedUntil: null,
          failedLoginAttempts: 0,
          lastLogoutAt: null,
          lastLoginAt: mockPrismaUser.lastLoginAt,
          lastFailedLoginAt: null,
        },
        createdAt: mockPrismaUser.createdAt,
        updatedAt: mockPrismaUser.updatedAt,
      });
      expect(result).toBe(mockUserEntity);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.findById.success",
          context: "PrismaUserRepository",
        }),
      );
    });

    it("should return null when user is not found", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const result = await repository.findById("non-existent-id");

      expect(result).toBeNull();
      expect(User.rebuild).not.toHaveBeenCalled();
    });

    it("should include id in additional context", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockPrismaUser);

      await repository.findById("test-id-456");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: "test-id-456",
          }),
        }),
      );
    });

    it("should log error and throw when findUnique fails", async () => {
      const error = new Error("Database connection failed");
      mockPrismaClient.user.findUnique.mockRejectedValue(error);

      await expect(repository.findById("user-123")).rejects.toThrow("Database connection failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.findById.error",
          message: "findById operation failed",
        }),
      );
    });
  });

  describe("findByEmail", () => {
    it("should find user by email and return entity", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockPrismaUser);

      const result = await repository.findByEmail("john@example.com");

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: "john@example.com" },
      });
      expect(User.rebuild).toHaveBeenCalled();
      expect(result).toBe(mockUserEntity);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.findByEmail.success",
        }),
      );
    });

    it("should return null when user with email is not found", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const result = await repository.findByEmail("notfound@example.com");

      expect(result).toBeNull();
      expect(User.rebuild).not.toHaveBeenCalled();
    });

    it("should include email in additional context", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockPrismaUser);

      await repository.findByEmail("specific@example.com");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: "specific@example.com",
          }),
        }),
      );
    });

    it("should log error and throw when findUnique fails", async () => {
      const error = new Error("Query timeout");
      mockPrismaClient.user.findUnique.mockRejectedValue(error);

      await expect(repository.findByEmail("test@example.com")).rejects.toThrow("Query timeout");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.findByEmail.error",
          message: "findByEmail operation failed",
        }),
      );
    });
  });

  describe("insert", () => {
    it("should insert user successfully", async () => {
      mockPrismaClient.user.create.mockResolvedValue(mockPrismaUser);

      await repository.insert(mockUserEntity);

      expect(UserMapper.toPlainObject).toHaveBeenCalledWith(mockUserEntity);
      expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
        data: mockPlainObject,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.insert.success",
        }),
      );
    });

    it("should include user email in additional context", async () => {
      mockPrismaClient.user.create.mockResolvedValue(mockPrismaUser);
      (mockUserEntity.getEmail as jest.Mock).mockReturnValue("newemail@example.com");

      await repository.insert(mockUserEntity);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: "newemail@example.com",
          }),
        }),
      );
    });

    it("should throw EMAIL_EXISTS when duplicate email constraint is violated", async () => {
      const error = {
        code: "23505",
        constraint: "users_email_key",
      };
      mockPrismaClient.user.create.mockRejectedValue(error);
      (mockUserEntity.getEmail as jest.Mock).mockReturnValue("existing@example.com");

      await expect(repository.insert(mockUserEntity)).rejects.toThrow(AUTH_EXCEPTIONS.EMAIL_EXISTS({ email: "existing@example.com" }));
    });

    it("should throw original error for non-23505 errors", async () => {
      const error = new Error("Database connection failed");
      mockPrismaClient.user.create.mockRejectedValue(error);

      await expect(repository.insert(mockUserEntity)).rejects.toThrow("Database connection failed");
    });

    it("should log error and throw when create fails", async () => {
      const error = new Error("Unique constraint violation");
      mockPrismaClient.user.create.mockRejectedValue(error);

      await expect(repository.insert(mockUserEntity)).rejects.toThrow("Unique constraint violation");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.insert.error",
          message: "insert operation failed",
        }),
      );
    });

    it("should return void", async () => {
      mockPrismaClient.user.create.mockResolvedValue(mockPrismaUser);
      const result = await repository.insert(mockUserEntity);
      expect(result).toBeUndefined();
    });
  });

  describe("update", () => {
    it("should update user successfully", async () => {
      const updatedPlainObject = { ...mockPlainObject, name: "John Updated" };
      (UserMapper.toPlainObject as jest.Mock).mockReturnValue(updatedPlainObject);
      mockPrismaClient.user.update.mockResolvedValue(mockPrismaUser);
      (mockUserEntity.getId as jest.Mock).mockReturnValue("user-123");

      await repository.update(mockUserEntity);

      expect(UserMapper.toPlainObject).toHaveBeenCalledWith(mockUserEntity);
      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: updatedPlainObject,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.update.success",
        }),
      );
    });

    it("should include user email in additional context", async () => {
      mockPrismaClient.user.update.mockResolvedValue(mockPrismaUser);
      (mockUserEntity.getEmail as jest.Mock).mockReturnValue("updated@example.com");

      await repository.update(mockUserEntity);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: "updated@example.com",
          }),
        }),
      );
    });

    it("should return void", async () => {
      mockPrismaClient.user.update.mockResolvedValue(mockPrismaUser);
      const result = await repository.update(mockUserEntity);
      expect(result).toBeUndefined();
    });

    it("should log error and throw when update fails", async () => {
      const error = new Error("Record not found");
      mockPrismaClient.user.update.mockRejectedValue(error);

      await expect(repository.update(mockUserEntity)).rejects.toThrow("Record not found");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.update.error",
          message: "update operation failed",
        }),
      );
    });

    it("should use correct user id from entity", async () => {
      mockPrismaClient.user.update.mockResolvedValue(mockPrismaUser);
      (mockUserEntity.getId as jest.Mock).mockReturnValue("specific-user-id-999");

      await repository.update(mockUserEntity);

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: "specific-user-id-999" },
        data: expect.any(Object),
      });
    });
  });

  describe("delete", () => {
    it("should delete user by id", async () => {
      mockPrismaClient.user.delete.mockResolvedValue(mockPrismaUser);

      await repository.delete("user-123");

      expect(mockPrismaClient.user.delete).toHaveBeenCalledWith({
        where: { id: "user-123" },
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.delete.success",
        }),
      );
    });

    it("should include id in additional context", async () => {
      mockPrismaClient.user.delete.mockResolvedValue(mockPrismaUser);

      await repository.delete("delete-id-456");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: "delete-id-456",
          }),
        }),
      );
    });

    it("should return void", async () => {
      mockPrismaClient.user.delete.mockResolvedValue(mockPrismaUser);
      const result = await repository.delete("user-123");
      expect(result).toBeUndefined();
    });

    it("should log error and throw when delete fails", async () => {
      const error = new Error("Record to delete does not exist");
      mockPrismaClient.user.delete.mockRejectedValue(error);

      await expect(repository.delete("non-existent")).rejects.toThrow("Record to delete does not exist");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.delete.error",
          message: "delete operation failed",
        }),
      );
    });
  });

  describe("toEntity (private method)", () => {
    it("should convert PrismaUser to User entity with all fields", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockPrismaUser);

      await repository.findById("user-123");

      expect(User.rebuild).toHaveBeenCalledWith({
        id: "user-123",
        profile: {
          name: "John Doe",
          address: "123 Main St",
        },
        email: {
          address: "john@example.com",
          changedAt: mockPrismaUser.emailChangedAt,
          verifiedAt: mockPrismaUser.emailVerifiedAt,
        },
        password: {
          hashedPassword: "hashed-password-123",
          changedAt: mockPrismaUser.passwordChangedAt,
        },
        role: UserRoleType.MEMBER,
        status: {
          status: "ACTIVE",
          bannedAt: null,
          bannedReason: null,
          suspendedAt: null,
          suspendReason: null,
        },
        security: {
          accountLockedUntil: null,
          failedLoginAttempts: 0,
          lastLogoutAt: null,
          lastLoginAt: mockPrismaUser.lastLoginAt,
          lastFailedLoginAt: null,
        },
        createdAt: mockPrismaUser.createdAt,
        updatedAt: mockPrismaUser.updatedAt,
      });
    });

    it("should handle user with banned status", async () => {
      const bannedUser = {
        ...mockPrismaUser,
        status: "BANNED",
        bannedAt: new Date("2024-02-01"),
        bannedReason: "Violation of terms",
      };
      mockPrismaClient.user.findUnique.mockResolvedValue(bannedUser);

      await repository.findById("banned-user");

      expect(User.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          status: {
            status: "BANNED",
            bannedAt: bannedUser.bannedAt,
            bannedReason: "Violation of terms",
            suspendedAt: null,
            suspendReason: null,
          },
        }),
      );
    });

    it("should handle user with suspended status", async () => {
      const suspendedUser = {
        ...mockPrismaUser,
        status: "SUSPENDED",
        suspendedAt: new Date("2024-03-01"),
        suspendReason: "Temporary suspension",
      };
      mockPrismaClient.user.findUnique.mockResolvedValue(suspendedUser);

      await repository.findById("suspended-user");

      expect(User.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          status: {
            status: "SUSPENDED",
            bannedAt: null,
            bannedReason: null,
            suspendedAt: suspendedUser.suspendedAt,
            suspendReason: "Temporary suspension",
          },
        }),
      );
    });

    it("should handle user with locked account", async () => {
      const lockedUser = {
        ...mockPrismaUser,
        accountLockedUntil: new Date("2024-12-31"),
        failedLoginAttempts: 5,
        lastFailedLoginAt: new Date("2024-01-20"),
      };
      mockPrismaClient.user.findUnique.mockResolvedValue(lockedUser);

      await repository.findById("locked-user");

      expect(User.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          security: {
            accountLockedUntil: lockedUser.accountLockedUntil,
            failedLoginAttempts: 5,
            lastLogoutAt: null,
            lastLoginAt: lockedUser.lastLoginAt,
            lastFailedLoginAt: lockedUser.lastFailedLoginAt,
          },
        }),
      );
    });

    it("should handle user with admin role", async () => {
      const adminUser = {
        ...mockPrismaUser,
        role: "ADMIN",
      };
      mockPrismaClient.user.findUnique.mockResolvedValue(adminUser);

      await repository.findById("admin-user");

      expect(User.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "ADMIN",
        }),
      );
    });

    it("should handle user with null optional fields", async () => {
      const minimalUser = {
        ...mockPrismaUser,
        address: null,
        emailChangedAt: null,
        emailVerifiedAt: null,
        passwordChangedAt: null,
        lastLogoutAt: null,
        lastLoginAt: null,
        lastFailedLoginAt: null,
      };
      mockPrismaClient.user.findUnique.mockResolvedValue(minimalUser);

      await repository.findById("minimal-user");

      expect(User.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          profile: {
            name: "John Doe",
            address: null,
          },
          email: {
            address: "john@example.com",
            changedAt: null,
            verifiedAt: null,
          },
          password: {
            hashedPassword: "hashed-password-123",
            changedAt: null,
          },
          security: {
            accountLockedUntil: null,
            failedLoginAttempts: 0,
            lastLogoutAt: null,
            lastLoginAt: null,
            lastFailedLoginAt: null,
          },
        }),
      );
    });
  });

  describe("integration with transaction", () => {
    it("should use transaction prisma client when in transaction", async () => {
      const mockTransactionPrisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue(mockPrismaUser),
        },
      } as any;
      const txContext = new PrismaTransactionContext(mockTransactionPrisma);
      const txRepo = new PrismaUserRepository(mockLogger, mockDbClient, txContext);

      await txRepo.findById("user-123");

      expect(mockTransactionPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
      });
      expect(mockPrismaClient.user.findUnique).not.toHaveBeenCalled();
    });

    it("should execute insert in transaction", async () => {
      const mockTransactionPrisma = {
        user: {
          create: jest.fn().mockResolvedValue(mockPrismaUser),
        },
      } as any;
      const txContext = new PrismaTransactionContext(mockTransactionPrisma);
      const txRepo = repository.withTransaction(txContext);

      await txRepo.insert(mockUserEntity);

      expect(mockTransactionPrisma.user.create).toHaveBeenCalled();
    });

    it("should execute update in transaction", async () => {
      const mockTransactionPrisma = {
        user: {
          update: jest.fn().mockResolvedValue(mockPrismaUser),
        },
      } as any;
      const txContext = new PrismaTransactionContext(mockTransactionPrisma);
      const txRepo = repository.withTransaction(txContext);

      await txRepo.update(mockUserEntity);

      expect(mockTransactionPrisma.user.update).toHaveBeenCalled();
    });

    it("should execute delete in transaction", async () => {
      const mockTransactionPrisma = {
        user: {
          delete: jest.fn().mockResolvedValue(mockPrismaUser),
        },
      } as any;
      const txContext = new PrismaTransactionContext(mockTransactionPrisma);
      const txRepo = repository.withTransaction(txContext);

      await txRepo.delete("user-123");

      expect(mockTransactionPrisma.user.delete).toHaveBeenCalled();
    });
  });

  describe("error scenarios", () => {
    it("should handle network errors in findById", async () => {
      const networkError = new Error("ECONNREFUSED");
      mockPrismaClient.user.findUnique.mockRejectedValue(networkError);

      await expect(repository.findById("user-123")).rejects.toThrow("ECONNREFUSED");
    });

    it("should handle constraint violations in insert", async () => {
      const constraintError = new Error("Unique constraint failed on the fields: (`email`)");
      mockPrismaClient.user.create.mockRejectedValue(constraintError);

      await expect(repository.insert(mockUserEntity)).rejects.toThrow("Unique constraint failed");
    });

    it("should handle not found errors in update", async () => {
      const notFoundError = new Error("Record to update not found");
      mockPrismaClient.user.update.mockRejectedValue(notFoundError);

      await expect(repository.update(mockUserEntity)).rejects.toThrow("Record to update not found");
    });

    it("should handle Prisma client not available", async () => {
      mockDbClient.getPrismaClient.mockRejectedValue(new Error("Prisma client not available"));

      await expect(repository.findById("user-123")).rejects.toThrow("Prisma client not available");
    });
  });

  describe("logging behavior", () => {
    it("should log with correct context for all operations", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockPrismaUser);

      await repository.findById("user-123");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "PrismaUserRepository",
        }),
      );
    });

    it("should measure operation duration", async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockPrismaUser);

      await repository.findById("user-123");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: expect.any(Number),
        }),
      );
    });

    it("should log errors with stack trace", async () => {
      const error = new Error("Test error");
      error.stack = "Error stack trace here";
      mockPrismaClient.user.update.mockRejectedValue(error);

      await expect(repository.update(mockUserEntity)).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: "Error stack trace here",
        }),
      );
    });
  });

  describe("edge cases", () => {
    it("should handle user with very old dates", async () => {
      const oldDate = new Date("1970-01-01");
      const userWithOldDates = {
        ...mockPrismaUser,
        createdAt: oldDate,
        updatedAt: oldDate,
        emailChangedAt: oldDate,
        emailVerifiedAt: oldDate,
        passwordChangedAt: oldDate,
      };
      mockPrismaClient.user.findUnique.mockResolvedValue(userWithOldDates);

      await repository.findById("user-123");

      expect(User.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: oldDate,
          updatedAt: oldDate,
        }),
      );
    });

    it("should handle user with very future dates", async () => {
      const futureDate = new Date("2099-12-31");
      const userWithFutureDates = {
        ...mockPrismaUser,
        createdAt: futureDate,
        updatedAt: futureDate,
        emailChangedAt: futureDate,
        emailVerifiedAt: futureDate,
        passwordChangedAt: futureDate,
      };
      mockPrismaClient.user.findUnique.mockResolvedValue(userWithFutureDates);

      await repository.findById("user-123");

      expect(User.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: futureDate,
          updatedAt: futureDate,
        }),
      );
    });

    it("should handle user with empty string values", async () => {
      const userWithEmptyStrings = {
        ...mockPrismaUser,
        address: "",
        name: "",
      };
      mockPrismaClient.user.findUnique.mockResolvedValue(userWithEmptyStrings);

      await repository.findById("user-123");

      expect(User.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          profile: {
            name: "",
            address: "",
          },
        }),
      );
    });

    it("should handle user with special characters in name", async () => {
      const userWithSpecialChars = {
        ...mockPrismaUser,
        name: "John O'Brien-Smith Jr. 🚀",
      };
      mockPrismaClient.user.findUnique.mockResolvedValue(userWithSpecialChars);

      await repository.findById("user-123");

      expect(User.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          profile: {
            name: "John O'Brien-Smith Jr. 🚀",
            address: "123 Main St",
          },
        }),
      );
    });

    it("should handle email exists error with proper message", async () => {
      const error = {
        code: "23505",
        constraint: "users_email_key",
      };
      mockPrismaClient.user.create.mockRejectedValue(error);
      (mockUserEntity.getEmail as jest.Mock).mockReturnValue("duplicate@example.com");

      await expect(repository.insert(mockUserEntity)).rejects.toThrow(AUTH_EXCEPTIONS.EMAIL_EXISTS({ email: "duplicate@example.com" }));
    });

    it("should handle error with code but no constraint", async () => {
      const error = {
        code: "23505",
      };
      mockPrismaClient.user.create.mockRejectedValue(error);

      await expect(repository.insert(mockUserEntity)).rejects.toEqual(error);
    });
  });
});
