import { PrismaApplicationTokenRepository } from "@/infrastructure/database/repositories/prisma-application-token.repository";
import { PrismaDatabaseClient } from "@/infrastructure/database/prisma-database-client";
import { PrismaTransactionContext } from "@/infrastructure/database/prisma-transaction-context";
import { Logger } from "@/application/ports/driven/logger";
import { TransactionContext } from "@/application/ports/driven/database";
import { VerificationEmailToken, PasswordResetToken, GuestOrderManagementToken, ApplicationToken } from "@/domain/entities/application-token.entity";
import { ApplicationTokenType } from "@/domain/types/application-token-type.enum";
import { ApplicationTokenMapper } from "@/application/mappers/application-token.mapper";
import { ApplicationToken as PrismaApplicationToken } from "../../../../../prisma/generated";

jest.mock("@/application/mappers/application-token.mapper");

describe("PrismaApplicationTokenRepository", () => {
  let repository: PrismaApplicationTokenRepository;
  let mockLogger: jest.Mocked<Logger>;
  let mockDbClient: jest.Mocked<PrismaDatabaseClient>;
  let mockPrismaClient: jest.Mocked<any>;

  const mockPrismaPasswordResetToken: PrismaApplicationToken = {
    id: "token-123",
    tokenHash: "hashed-token-xyz",
    identifier: "user@example.com",
    orderId: null,
    userId: "user-456",
    type: "PASSWORD_RESET",
    expires: new Date("2024-12-31"),
    usedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
  };

  const mockPrismaVerificationToken: PrismaApplicationToken = {
    id: "token-verify-123",
    tokenHash: "hashed-verify-token",
    identifier: "verify@example.com",
    orderId: null,
    userId: "user-verify-456",
    type: "VERIFICATION_EMAIL",
    expires: new Date("2024-12-31"),
    usedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
  };

  const mockPrismaGuestOrderToken: PrismaApplicationToken = {
    id: "token-guest-123",
    tokenHash: "hashed-guest-token",
    identifier: "guest@example.com",
    orderId: "order-789",
    userId: "order-789",
    type: "GUEST_ORDER_MANAGEMENT",
    expires: new Date("2024-12-31"),
    usedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
  };

  const mockPasswordResetTokenEntity = {
    getId: jest.fn().mockReturnValue("token-123"),
    getType: jest.fn().mockReturnValue(ApplicationTokenType.PASSWORD_RESET),
    getTokenHash: jest.fn().mockReturnValue("hashed-token-xyz"),
    getIdentifier: jest.fn().mockReturnValue("user@example.com"),
    getExpiresAt: jest.fn().mockReturnValue(new Date("2024-12-31")),
    getUsedAt: jest.fn().mockReturnValue(null),
    getUserId: jest.fn().mockReturnValue("user-456"),
    getCreatedAt: jest.fn().mockReturnValue(new Date("2024-01-01")),
    getUpdatedAt: jest.fn().mockReturnValue(new Date("2024-01-15")),
  } as unknown as PasswordResetToken;

  const mockVerificationEmailTokenEntity = {
    getId: jest.fn().mockReturnValue("token-verify-123"),
    getType: jest.fn().mockReturnValue(ApplicationTokenType.VERIFICATION_EMAIL),
    getTokenHash: jest.fn().mockReturnValue("hashed-verify-token"),
    getIdentifier: jest.fn().mockReturnValue("verify@example.com"),
    getExpiresAt: jest.fn().mockReturnValue(new Date("2024-12-31")),
    getUsedAt: jest.fn().mockReturnValue(null),
    getUserId: jest.fn().mockReturnValue("user-verify-456"),
    getCreatedAt: jest.fn().mockReturnValue(new Date("2024-01-01")),
    getUpdatedAt: jest.fn().mockReturnValue(new Date("2024-01-15")),
  } as unknown as VerificationEmailToken;

  const mockGuestOrderTokenEntity = {
    getId: jest.fn().mockReturnValue("token-guest-123"),
    getType: jest.fn().mockReturnValue(ApplicationTokenType.GUEST_ORDER_MANAGEMENT),
    getTokenHash: jest.fn().mockReturnValue("hashed-guest-token"),
    getIdentifier: jest.fn().mockReturnValue("guest@example.com"),
    getExpiresAt: jest.fn().mockReturnValue(new Date("2024-12-31")),
    getUsedAt: jest.fn().mockReturnValue(null),
    getOrderId: jest.fn().mockReturnValue("order-789"),
    getCreatedAt: jest.fn().mockReturnValue(new Date("2024-01-01")),
    getUpdatedAt: jest.fn().mockReturnValue(new Date("2024-01-15")),
  } as unknown as GuestOrderManagementToken;

  const mockPlainObject = {
    id: "token-123",
    tokenHash: "hashed-token-xyz",
    identifier: "user@example.com",
    userId: "user-456",
    type: "PASSWORD_RESET",
    expires: new Date("2024-12-31"),
    usedAt: null,
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
      applicationToken: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    mockDbClient = {
      getPrismaClient: jest.fn().mockReturnValue(mockPrismaClient),
      executeInTransaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaDatabaseClient>;

    (ApplicationTokenMapper.verificationEmailTokenToPlainObject as jest.Mock).mockReturnValue(mockPlainObject);
    (ApplicationTokenMapper.passwordResetTokenToPlainObject as jest.Mock).mockReturnValue(mockPlainObject);
    (ApplicationTokenMapper.guestOrderManagementTokenToPlainObject as jest.Mock).mockReturnValue({
      ...mockPlainObject,
      orderId: "order-789",
    });

    jest.spyOn(PasswordResetToken, "rebuild").mockReturnValue(mockPasswordResetTokenEntity);
    jest.spyOn(VerificationEmailToken, "rebuild").mockReturnValue(mockVerificationEmailTokenEntity);
    jest.spyOn(GuestOrderManagementToken, "rebuild").mockReturnValue(mockGuestOrderTokenEntity);

    repository = new PrismaApplicationTokenRepository(mockLogger, mockDbClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with logger and dbClient", () => {
      const repo = new PrismaApplicationTokenRepository(mockLogger, mockDbClient);
      expect(repo).toBeInstanceOf(PrismaApplicationTokenRepository);
    });

    it("should initialize with transaction context", () => {
      const mockPrismaTransaction = { applicationToken: { create: jest.fn() } } as any;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);
      const repo = new PrismaApplicationTokenRepository(mockLogger, mockDbClient, txContext);
      expect(repo).toBeInstanceOf(PrismaApplicationTokenRepository);
    });

    it("should set repositoryName correctly", () => {
      expect((repository as any).repositoryName).toBe("PrismaApplicationTokenRepository");
    });
  });

  describe("withTransaction", () => {
    it("should create new repository instance with transaction context", () => {
      const mockPrismaTransaction = { applicationToken: { create: jest.fn() } } as any;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);
      const txRepo = repository.withTransaction(txContext);
      expect(txRepo).toBeInstanceOf(PrismaApplicationTokenRepository);
      expect(txRepo).not.toBe(repository);
    });

    it("should throw error for invalid transaction context", () => {
      const invalidTx = {} as TransactionContext;
      expect(() => {
        repository.withTransaction(invalidTx);
      }).toThrow("Invalid transaction context for PrismaApplicationTokenRepository. Expected PrismaTransactionContext.");
    });
  });

  describe("insert", () => {
    it("should insert password reset token successfully", async () => {
      mockPrismaClient.applicationToken.create.mockResolvedValue(mockPrismaPasswordResetToken);

      await repository.insert(mockPasswordResetTokenEntity);

      expect(ApplicationTokenMapper.passwordResetTokenToPlainObject).toHaveBeenCalledWith(mockPasswordResetTokenEntity);
      expect(mockPrismaClient.applicationToken.create).toHaveBeenCalledWith({
        data: mockPlainObject,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.insert.success",
          context: "PrismaApplicationTokenRepository",
        }),
      );
    });

    it("should insert verification email token successfully", async () => {
      mockPrismaClient.applicationToken.create.mockResolvedValue(mockPrismaVerificationToken);

      await repository.insert(mockVerificationEmailTokenEntity);

      expect(ApplicationTokenMapper.verificationEmailTokenToPlainObject).toHaveBeenCalledWith(mockVerificationEmailTokenEntity);
      expect(mockPrismaClient.applicationToken.create).toHaveBeenCalledWith({
        data: mockPlainObject,
      });
    });

    it("should insert guest order management token successfully", async () => {
      mockPrismaClient.applicationToken.create.mockResolvedValue(mockPrismaGuestOrderToken);

      await repository.insert(mockGuestOrderTokenEntity);

      expect(ApplicationTokenMapper.guestOrderManagementTokenToPlainObject).toHaveBeenCalledWith(mockGuestOrderTokenEntity);
      expect(mockPrismaClient.applicationToken.create).toHaveBeenCalledWith({
        data: { ...mockPlainObject, orderId: "order-789" },
      });
    });

    it("should return void", async () => {
      mockPrismaClient.applicationToken.create.mockResolvedValue(mockPrismaPasswordResetToken);
      const result = await repository.insert(mockPasswordResetTokenEntity);
      expect(result).toBeUndefined();
    });

    it("should log error and throw when create fails", async () => {
      const error = new Error("Database connection failed");
      mockPrismaClient.applicationToken.create.mockRejectedValue(error);

      await expect(repository.insert(mockPasswordResetTokenEntity)).rejects.toThrow("Database connection failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.insert.error",
          message: "insert operation failed",
        }),
      );
    });

    it("should handle constraint violation errors", async () => {
      const error = new Error("Unique constraint failed");
      mockPrismaClient.applicationToken.create.mockRejectedValue(error);

      await expect(repository.insert(mockPasswordResetTokenEntity)).rejects.toThrow("Unique constraint failed");
    });
  });

  describe("update", () => {
    it("should update token successfully", async () => {
      (mockPasswordResetTokenEntity.getUsedAt as jest.Mock).mockReturnValue(new Date("2024-02-01"));
      mockPrismaClient.applicationToken.update.mockResolvedValue(mockPrismaPasswordResetToken);

      await repository.update(mockPasswordResetTokenEntity);

      expect(ApplicationTokenMapper.passwordResetTokenToPlainObject).toHaveBeenCalledWith(mockPasswordResetTokenEntity);
      expect(mockPrismaClient.applicationToken.update).toHaveBeenCalledWith({
        where: { tokenHash: "hashed-token-xyz" },
        data: mockPlainObject,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.objectContaining({ event: "repository.update.success" }));
    });

    it("should return void", async () => {
      mockPrismaClient.applicationToken.update.mockResolvedValue(mockPrismaPasswordResetToken);
      const result = await repository.update(mockPasswordResetTokenEntity);
      expect(result).toBeUndefined();
    });

    it("should log error and throw when update fails", async () => {
      const error = new Error("Record to update not found");
      mockPrismaClient.applicationToken.update.mockRejectedValue(error);

      await expect(repository.update(mockPasswordResetTokenEntity)).rejects.toThrow("Record to update not found");
      expect(mockLogger.error).toHaveBeenCalledWith(expect.objectContaining({ event: "repository.update.error" }));
    });
  });

  describe("invalidateByTypeAndIdentifier", () => {
    it("should invalidate all valid tokens of a type and identifier", async () => {
      mockPrismaClient.applicationToken.updateMany.mockResolvedValue({ count: 2 });

      await repository.invalidateByTypeAndIdentifier(ApplicationTokenType.VERIFICATION_EMAIL, "test@example.com");

      expect(mockPrismaClient.applicationToken.updateMany).toHaveBeenCalledWith({
        where: { type: ApplicationTokenType.VERIFICATION_EMAIL, identifier: "test@example.com", usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.invalidateByTypeAndIdentifier.success",
        }),
      );
    });

    it("should handle invalidating non-existent tokens gracefully", async () => {
      mockPrismaClient.applicationToken.updateMany.mockResolvedValue({ count: 0 });

      await repository.invalidateByTypeAndIdentifier(ApplicationTokenType.PASSWORD_RESET, "nonexistent@example.com");

      expect(mockPrismaClient.applicationToken.updateMany).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it("should log error and throw when invalidation fails", async () => {
      const error = new Error("Database error");
      mockPrismaClient.applicationToken.updateMany.mockRejectedValue(error);

      await expect(repository.invalidateByTypeAndIdentifier(ApplicationTokenType.VERIFICATION_EMAIL, "test@example.com")).rejects.toThrow(
        "Database error",
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.invalidateByTypeAndIdentifier.error",
        }),
      );
    });
  });

  describe("countByTypeAndIdentifierWithin", () => {
    it("should count tokens created within time window", async () => {
      mockPrismaClient.applicationToken.count.mockResolvedValue(3);

      const result = await repository.countByTypeAndIdentifierWithin(ApplicationTokenType.VERIFICATION_EMAIL, "test@example.com", 3600000);

      expect(result).toBe(3);
      expect(mockPrismaClient.applicationToken.count).toHaveBeenCalledWith({
        where: {
          type: ApplicationTokenType.VERIFICATION_EMAIL,
          identifier: "test@example.com",
          usedAt: null,
          createdAt: { gt: expect.any(Date) },
        },
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.countByTypeAndIdentifierWithin.success",
        }),
      );
    });

    it("should return 0 when no tokens found", async () => {
      mockPrismaClient.applicationToken.count.mockResolvedValue(0);

      const result = await repository.countByTypeAndIdentifierWithin(ApplicationTokenType.PASSWORD_RESET, "nonexistent@example.com", 3600000);

      expect(result).toBe(0);
    });

    it("should log error and throw when count fails", async () => {
      const error = new Error("Database error");
      mockPrismaClient.applicationToken.count.mockRejectedValue(error);

      await expect(repository.countByTypeAndIdentifierWithin(ApplicationTokenType.VERIFICATION_EMAIL, "test@example.com", 3600000)).rejects.toThrow(
        "Database error",
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.countByTypeAndIdentifierWithin.error",
        }),
      );
    });
  });

  describe("findByTokenHash", () => {
    it("should find token by hash and return entity", async () => {
      mockPrismaClient.applicationToken.findUnique.mockResolvedValue(mockPrismaPasswordResetToken);

      const result = await repository.findByTokenHash("hashed-token-xyz");

      expect(mockPrismaClient.applicationToken.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: "hashed-token-xyz", identifier: undefined },
      });
      expect(PasswordResetToken.rebuild).toHaveBeenCalled();
      expect(result).toBe(mockPasswordResetTokenEntity);
    });

    it("should find token by hash with identifier", async () => {
      mockPrismaClient.applicationToken.findUnique.mockResolvedValue(mockPrismaPasswordResetToken);

      await repository.findByTokenHash("hashed-token-xyz", "user@example.com");

      expect(mockPrismaClient.applicationToken.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: "hashed-token-xyz", identifier: "user@example.com" },
      });
    });

    it("should return null when token is not found", async () => {
      mockPrismaClient.applicationToken.findUnique.mockResolvedValue(null);

      const result = await repository.findByTokenHash("non-existent-token");

      expect(result).toBeNull();
      expect(PasswordResetToken.rebuild).not.toHaveBeenCalled();
    });

    it("should log error and throw when findUnique fails", async () => {
      const error = new Error("Query execution failed");
      mockPrismaClient.applicationToken.findUnique.mockRejectedValue(error);

      await expect(repository.findByTokenHash("hash-123")).rejects.toThrow("Query execution failed");
      expect(mockLogger.error).toHaveBeenCalledWith(expect.objectContaining({ event: "repository.findByTokenHash.error" }));
    });
  });

  describe("findValidTokenByTypeAndIdentifier", () => {
    it("should find valid password reset token", async () => {
      mockPrismaClient.applicationToken.findFirst.mockResolvedValue(mockPrismaPasswordResetToken);

      const result = await repository.findValidTokenByTypeAndIdentifier(ApplicationTokenType.PASSWORD_RESET, "user@example.com");

      expect(mockPrismaClient.applicationToken.findFirst).toHaveBeenCalledWith({
        where: {
          type: ApplicationTokenType.PASSWORD_RESET,
          identifier: "user@example.com",
          expires: { gt: expect.any(Date) },
          usedAt: null,
        },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toBe(mockPasswordResetTokenEntity);
    });

    it("should find valid verification email token", async () => {
      mockPrismaClient.applicationToken.findFirst.mockResolvedValue(mockPrismaVerificationToken);

      const result = await repository.findValidTokenByTypeAndIdentifier(ApplicationTokenType.VERIFICATION_EMAIL, "verify@example.com");

      expect(result).toBe(mockVerificationEmailTokenEntity);
      expect(VerificationEmailToken.rebuild).toHaveBeenCalled();
    });

    it("should find valid guest order management token", async () => {
      mockPrismaClient.applicationToken.findFirst.mockResolvedValue(mockPrismaGuestOrderToken);

      const result = await repository.findValidTokenByTypeAndIdentifier(ApplicationTokenType.GUEST_ORDER_MANAGEMENT, "guest@example.com");

      expect(result).toBe(mockGuestOrderTokenEntity);
      expect(GuestOrderManagementToken.rebuild).toHaveBeenCalled();
    });

    it("should return null when no valid token found", async () => {
      mockPrismaClient.applicationToken.findFirst.mockResolvedValue(null);

      const result = await repository.findValidTokenByTypeAndIdentifier(ApplicationTokenType.PASSWORD_RESET, "notoken@example.com");

      expect(result).toBeNull();
    });

    it("should order by createdAt desc to get most recent", async () => {
      mockPrismaClient.applicationToken.findFirst.mockResolvedValue(mockPrismaPasswordResetToken);

      await repository.findValidTokenByTypeAndIdentifier(ApplicationTokenType.PASSWORD_RESET, "user@example.com");

      expect(mockPrismaClient.applicationToken.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        }),
      );
    });
  });

  describe("findLastTokenByTypeAndIdentifier", () => {
    it("should find last password reset token", async () => {
      mockPrismaClient.applicationToken.findFirst.mockResolvedValue(mockPrismaPasswordResetToken);

      const result = await repository.findLastTokenByTypeAndIdentifier(ApplicationTokenType.PASSWORD_RESET, "user@example.com");

      expect(mockPrismaClient.applicationToken.findFirst).toHaveBeenCalledWith({
        where: {
          type: ApplicationTokenType.PASSWORD_RESET,
          identifier: "user@example.com",
        },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toBe(mockPasswordResetTokenEntity);
    });

    it("should find last verification email token", async () => {
      mockPrismaClient.applicationToken.findFirst.mockResolvedValue(mockPrismaVerificationToken);

      const result = await repository.findLastTokenByTypeAndIdentifier(ApplicationTokenType.VERIFICATION_EMAIL, "verify@example.com");

      expect(result).toBe(mockVerificationEmailTokenEntity);
    });

    it("should return null when no token found", async () => {
      mockPrismaClient.applicationToken.findFirst.mockResolvedValue(null);

      const result = await repository.findLastTokenByTypeAndIdentifier(ApplicationTokenType.PASSWORD_RESET, "notoken@example.com");

      expect(result).toBeNull();
    });

    it("should not filter by isUsed or expires", async () => {
      mockPrismaClient.applicationToken.findFirst.mockResolvedValue(mockPrismaPasswordResetToken);

      await repository.findLastTokenByTypeAndIdentifier(ApplicationTokenType.PASSWORD_RESET, "user@example.com");

      expect(mockPrismaClient.applicationToken.findFirst).toHaveBeenCalledWith({
        where: {
          type: ApplicationTokenType.PASSWORD_RESET,
          identifier: "user@example.com",
        },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("toPlainObject (private method)", () => {
    it("should use ApplicationTokenMapper for verification token", async () => {
      await repository.insert(mockVerificationEmailTokenEntity);

      expect(ApplicationTokenMapper.verificationEmailTokenToPlainObject).toHaveBeenCalledWith(mockVerificationEmailTokenEntity);
    });

    it("should use ApplicationTokenMapper for password reset token", async () => {
      await repository.insert(mockPasswordResetTokenEntity);

      expect(ApplicationTokenMapper.passwordResetTokenToPlainObject).toHaveBeenCalledWith(mockPasswordResetTokenEntity);
    });

    it("should use ApplicationTokenMapper for guest order token", async () => {
      await repository.insert(mockGuestOrderTokenEntity);

      expect(ApplicationTokenMapper.guestOrderManagementTokenToPlainObject).toHaveBeenCalledWith(mockGuestOrderTokenEntity);
    });

    it("should throw error for unknown token type", async () => {
      const unknownToken = {
        getType: jest.fn().mockReturnValue("UNKNOWN_TYPE"),
      } as unknown as ApplicationToken;

      await expect(repository.insert(unknownToken)).rejects.toThrow("Unknown application token type: UNKNOWN_TYPE");
    });
  });

  describe("toEntity (private method)", () => {
    it("should convert PrismaApplicationToken to PasswordResetToken", async () => {
      mockPrismaClient.applicationToken.findUnique.mockResolvedValue(mockPrismaPasswordResetToken);

      await repository.findByTokenHash("hash");

      expect(PasswordResetToken.rebuild).toHaveBeenCalledWith({
        id: "token-123",
        identifier: "user@example.com",
        userId: "user-456",
        tokenHash: "hashed-token-xyz",
        expiresAt: new Date("2024-12-31"),
        type: ApplicationTokenType.PASSWORD_RESET,
        usedAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-15"),
      });
    });

    it("should convert PrismaApplicationToken to VerificationEmailToken", async () => {
      mockPrismaClient.applicationToken.findUnique.mockResolvedValue(mockPrismaVerificationToken);

      await repository.findByTokenHash("hash");

      expect(VerificationEmailToken.rebuild).toHaveBeenCalledWith({
        id: "token-verify-123",
        tokenHash: "hashed-verify-token",
        userId: "user-verify-456",
        identifier: "verify@example.com",
        expiresAt: new Date("2024-12-31"),
        type: ApplicationTokenType.VERIFICATION_EMAIL,
        usedAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-15"),
      });
    });

    it("should convert PrismaApplicationToken to GuestOrderManagementToken", async () => {
      mockPrismaClient.applicationToken.findUnique.mockResolvedValue(mockPrismaGuestOrderToken);

      await repository.findByTokenHash("hash");

      expect(GuestOrderManagementToken.rebuild).toHaveBeenCalledWith({
        id: "token-guest-123",
        expiresAt: new Date("2024-12-31"),
        tokenHash: "hashed-guest-token",
        identifier: "guest@example.com",
        orderId: "order-789",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-15"),
      });
    });

    it("should handle used token", async () => {
      const usedToken: PrismaApplicationToken = {
        ...mockPrismaPasswordResetToken,
        usedAt: new Date("2024-02-01"),
      };
      mockPrismaClient.applicationToken.findUnique.mockResolvedValue(usedToken);

      await repository.findByTokenHash("hash");

      expect(PasswordResetToken.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          usedAt: new Date("2024-02-01"),
        }),
      );
    });

    it("should handle expired token", async () => {
      const expiredToken: PrismaApplicationToken = {
        ...mockPrismaPasswordResetToken,
        expires: new Date("2020-01-01"),
      };
      mockPrismaClient.applicationToken.findUnique.mockResolvedValue(expiredToken);

      await repository.findByTokenHash("hash");

      expect(PasswordResetToken.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: new Date("2020-01-01"),
        }),
      );
    });

    it("should throw error for unknown token type", async () => {
      const unknownToken: PrismaApplicationToken = {
        ...mockPrismaPasswordResetToken,
        type: "UNKNOWN_TYPE" as ApplicationTokenType,
      };
      mockPrismaClient.applicationToken.findUnique.mockResolvedValue(unknownToken);

      await expect(repository.findByTokenHash("hash")).rejects.toThrow("Unknown application token type: UNKNOWN_TYPE");
    });
  });

  describe("integration with transaction", () => {
    it("should use transaction prisma client when in transaction", async () => {
      const mockTransactionPrisma = {
        applicationToken: {
          findUnique: jest.fn().mockResolvedValue(mockPrismaPasswordResetToken),
        },
      };
      const txContext = new PrismaTransactionContext(mockTransactionPrisma as any);
      const txRepo = new PrismaApplicationTokenRepository(mockLogger, mockDbClient, txContext);

      await txRepo.findByTokenHash("hash");

      expect(mockTransactionPrisma.applicationToken.findUnique).toHaveBeenCalled();
      expect(mockPrismaClient.applicationToken.findUnique).not.toHaveBeenCalled();
    });

    it("should execute insert in transaction", async () => {
      const mockTransactionPrisma = {
        applicationToken: {
          create: jest.fn().mockResolvedValue(mockPrismaPasswordResetToken),
        },
      };
      const txContext = new PrismaTransactionContext(mockTransactionPrisma as any);
      const txRepo = repository.withTransaction(txContext);

      await txRepo.insert(mockPasswordResetTokenEntity);

      expect(mockTransactionPrisma.applicationToken.create).toHaveBeenCalled();
    });

    it("should execute update in transaction", async () => {
      const mockTransactionPrisma = {
        applicationToken: {
          update: jest.fn().mockResolvedValue(mockPrismaPasswordResetToken),
        },
      };
      const txContext = new PrismaTransactionContext(mockTransactionPrisma as any);
      const txRepo = repository.withTransaction(txContext);

      await txRepo.update(mockPasswordResetTokenEntity);

      expect(mockTransactionPrisma.applicationToken.update).toHaveBeenCalled();
    });

    it("should execute invalidate in transaction", async () => {
      const mockTransactionPrisma = {
        applicationToken: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };
      const txContext = new PrismaTransactionContext(mockTransactionPrisma as any);
      const txRepo = repository.withTransaction(txContext);

      await txRepo.invalidateByTypeAndIdentifier(ApplicationTokenType.VERIFICATION_EMAIL, "test@example.com");

      expect(mockTransactionPrisma.applicationToken.updateMany).toHaveBeenCalled();
    });
  });

  describe("error scenarios", () => {
    it("should handle network errors", async () => {
      const error = new Error("ECONNREFUSED");
      mockPrismaClient.applicationToken.findUnique.mockRejectedValue(error);

      await expect(repository.findByTokenHash("hash")).rejects.toThrow("ECONNREFUSED");
    });

    it("should handle foreign key constraint violations", async () => {
      const error = new Error("Foreign key constraint failed");
      mockPrismaClient.applicationToken.create.mockRejectedValue(error);

      await expect(repository.insert(mockPasswordResetTokenEntity)).rejects.toThrow("Foreign key constraint failed");
    });

    it("should handle query timeout", async () => {
      const error = new Error("Query timeout");
      mockPrismaClient.applicationToken.findUnique.mockRejectedValue(error);

      await expect(repository.findByTokenHash("hash")).rejects.toThrow("Query timeout");
    });

    it("should handle Prisma client not available", async () => {
      mockDbClient.getPrismaClient.mockRejectedValue(new Error("Prisma client not available"));

      await expect(repository.findByTokenHash("hash")).rejects.toThrow("Prisma client not available");
    });
  });

  describe("logging behavior", () => {
    it("should log with correct context for all operations", async () => {
      mockPrismaClient.applicationToken.findUnique.mockResolvedValue(mockPrismaPasswordResetToken);

      await repository.findByTokenHash("hash");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "PrismaApplicationTokenRepository",
        }),
      );
    });

    it("should measure operation duration", async () => {
      mockPrismaClient.applicationToken.create.mockResolvedValue(mockPrismaPasswordResetToken);

      await repository.insert(mockPasswordResetTokenEntity);

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.objectContaining({ durationMs: expect.any(Number) }));
    });

    it("should log errors with stack trace", async () => {
      const error = new Error("Test error");
      error.stack = "Error stack trace here";
      mockPrismaClient.applicationToken.update.mockRejectedValue(error);

      await expect(repository.update(mockPasswordResetTokenEntity)).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(expect.objectContaining({ stack: "Error stack trace here" }));
    });
  });

  describe("edge cases", () => {
    it("should handle token with null userId", async () => {
      const tokenWithNullUserId = {
        ...mockPrismaPasswordResetToken,
        userId: null,
      };
      mockPrismaClient.applicationToken.findUnique.mockResolvedValue(tokenWithNullUserId);

      const result = await repository.findByTokenHash("hash");

      expect(result).toBe(mockPasswordResetTokenEntity);
      expect(PasswordResetToken.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
        }),
      );
    });

    it("should handle token with null identifier", async () => {
      const tokenWithNullIdentifier = {
        ...mockPrismaPasswordResetToken,
        identifier: null,
      };
      mockPrismaClient.applicationToken.findUnique.mockResolvedValue(tokenWithNullIdentifier);

      const result = await repository.findByTokenHash("hash");

      expect(result).toBe(mockPasswordResetTokenEntity);
      expect(PasswordResetToken.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: null,
        }),
      );
    });

    it("should handle very old dates", async () => {
      const oldDate = new Date("1970-01-01");
      const tokenWithOldDate = {
        ...mockPrismaPasswordResetToken,
        createdAt: oldDate,
        updatedAt: oldDate,
        expires: oldDate,
      };
      mockPrismaClient.applicationToken.findUnique.mockResolvedValue(tokenWithOldDate);

      await repository.findByTokenHash("hash");

      expect(PasswordResetToken.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: oldDate,
          updatedAt: oldDate,
          expiresAt: oldDate,
        }),
      );
    });

    it("should handle very future dates", async () => {
      const futureDate = new Date("2099-12-31");
      const tokenWithFutureDate = {
        ...mockPrismaPasswordResetToken,
        createdAt: futureDate,
        updatedAt: futureDate,
        expires: futureDate,
      };
      mockPrismaClient.applicationToken.findUnique.mockResolvedValue(tokenWithFutureDate);

      await repository.findByTokenHash("hash");

      expect(PasswordResetToken.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: futureDate,
          updatedAt: futureDate,
          expiresAt: futureDate,
        }),
      );
    });
  });
});
