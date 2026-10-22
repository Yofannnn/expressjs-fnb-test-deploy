import { PrismaSessionRepository } from "@/infrastructure/database/repositories/prisma-session.repository";
import { PrismaDatabaseClient } from "@/infrastructure/database/prisma-database-client";
import { PrismaTransactionContext } from "@/infrastructure/database/prisma-transaction-context";
import { Logger } from "@/application/ports/driven/logger";
import { Session } from "@/domain/entities/session.entity";
import { SessionMapper } from "@/application/mappers/session.mapper";
import { TransactionContext } from "@/application/ports/driven/database";

jest.mock("@/application/mappers/session.mapper");

describe("PrismaSessionRepository", () => {
  let repository: PrismaSessionRepository;
  let mockLogger: jest.Mocked<Logger>;
  let mockDbClient: jest.Mocked<PrismaDatabaseClient>;
  let mockPrismaClient: jest.Mocked<any>;

  const mockPrismaSession = {
    id: "session-123",
    tokenHash: "hashed-token-xyz",
    tokenFamily: "family-789",
    userId: "user-456",
    expiresAt: new Date("2024-12-31"),
    revokedAt: null,
    revokeReason: null,
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    deviceId: "device-abc-123",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
  };

  let mockSessionEntity: Session;
  const mockPlainObject = {
    id: "session-123",
    tokenHash: "hashed-token-xyz",
    tokenFamily: "family-789",
    userId: "user-456",
    expiresAt: new Date("2024-12-31"),
    revokedAt: null,
    revokeReason: null,
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0",
    deviceId: "device-abc-123",
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
      session: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    mockDbClient = {
      getPrismaClient: jest.fn().mockReturnValue(mockPrismaClient),
      executeInTransaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaDatabaseClient>;

    mockSessionEntity = {
      getId: jest.fn().mockReturnValue("session-123"),
      getUserId: jest.fn().mockReturnValue("user-456"),
      getTokenFamily: jest.fn().mockReturnValue("family-789"),
      getTokenHash: jest.fn().mockReturnValue("hashed-token-xyz"),
      isExpired: jest.fn().mockReturnValue(false),
      isRevoked: jest.fn().mockReturnValue(false),
      isActive: jest.fn().mockReturnValue(true),
      getExpiresAt: jest.fn().mockReturnValue(new Date("2024-12-31")),
      getRevokedAt: jest.fn().mockReturnValue(null),
      getRevokeReason: jest.fn().mockReturnValue(null),
      getIpAddress: jest.fn().mockReturnValue("192.168.1.1"),
      getUserAgent: jest.fn().mockReturnValue("Mozilla/5.0"),
      getDeviceId: jest.fn().mockReturnValue("device-abc-123"),
      getCreatedAt: jest.fn().mockReturnValue(new Date("2024-01-01")),
      getUpdatedAt: jest.fn().mockReturnValue(new Date("2024-01-15")),
      getRemainingTimeMs: jest.fn().mockReturnValue(1500000),
      revoke: jest.fn(),
    } as unknown as Session;

    (SessionMapper.toPlainObject as jest.Mock).mockReturnValue(mockPlainObject);

    jest.spyOn(Session, "rebuild").mockReturnValue(mockSessionEntity);

    repository = new PrismaSessionRepository(mockLogger, mockDbClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with logger and dbClient", () => {
      const repo = new PrismaSessionRepository(mockLogger, mockDbClient);
      expect(repo).toBeInstanceOf(PrismaSessionRepository);
    });

    it("should initialize with transaction context", () => {
      const mockPrismaTransaction = { session: { create: jest.fn() } } as any;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);
      const repo = new PrismaSessionRepository(mockLogger, mockDbClient, txContext);
      expect(repo).toBeInstanceOf(PrismaSessionRepository);
    });

    it("should set repositoryName correctly", () => {
      expect((repository as any).repositoryName).toBe("PrismaSessionRepository");
    });
  });

  describe("withTransaction", () => {
    it("should create new repository instance with transaction context", () => {
      const mockPrismaTransaction = { session: { create: jest.fn() } } as any;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);
      const txRepo = repository.withTransaction(txContext);
      expect(txRepo).toBeInstanceOf(PrismaSessionRepository);
      expect(txRepo).not.toBe(repository);
    });

    it("should throw error for invalid transaction context", () => {
      const invalidTx = {} as TransactionContext;
      expect(() => {
        repository.withTransaction(invalidTx);
      }).toThrow("Invalid transaction context for PrismaSessionRepository. Expected PrismaTransactionContext.");
    });
  });

  describe("insert", () => {
    it("should insert session successfully", async () => {
      mockPrismaClient.session.create.mockResolvedValue(mockPrismaSession);

      await repository.insert(mockSessionEntity);

      expect(SessionMapper.toPlainObject).toHaveBeenCalledWith(mockSessionEntity);
      expect(mockPrismaClient.session.create).toHaveBeenCalledWith({
        data: mockPlainObject,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.insert.success",
          context: "PrismaSessionRepository",
        }),
      );
    });

    it("should return void", async () => {
      mockPrismaClient.session.create.mockResolvedValue(mockPrismaSession);
      const result = await repository.insert(mockSessionEntity);
      expect(result).toBeUndefined();
    });

    it("should include userId in additional context", async () => {
      mockPrismaClient.session.create.mockResolvedValue(mockPrismaSession);
      (mockSessionEntity.getUserId as jest.Mock).mockReturnValue("specific-user-789");

      await repository.insert(mockSessionEntity);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "specific-user-789",
          }),
        }),
      );
    });

    it("should log error and throw when create fails", async () => {
      const error = new Error("Database connection failed");
      mockPrismaClient.session.create.mockRejectedValue(error);

      await expect(repository.insert(mockSessionEntity)).rejects.toThrow("Database connection failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.insert.error",
          message: "insert operation failed",
        }),
      );
    });

    it("should handle constraint violation errors", async () => {
      const error = new Error("Unique constraint failed on the fields: (`id`)");
      mockPrismaClient.session.create.mockRejectedValue(error);

      await expect(repository.insert(mockSessionEntity)).rejects.toThrow("Unique constraint failed");
    });
  });

  describe("update", () => {
    it("should update session successfully", async () => {
      const updatedPlainObject = {
        ...mockPlainObject,
        revokedAt: new Date("2024-02-01"),
        revokeReason: "Token rotation",
      };
      (SessionMapper.toPlainObject as jest.Mock).mockReturnValue(updatedPlainObject);
      mockPrismaClient.session.update.mockResolvedValue(mockPrismaSession);
      (mockSessionEntity.getId as jest.Mock).mockReturnValue("session-123");

      await repository.update(mockSessionEntity);

      expect(SessionMapper.toPlainObject).toHaveBeenCalledWith(mockSessionEntity);
      expect(mockPrismaClient.session.update).toHaveBeenCalledWith({
        where: { id: "session-123" },
        data: updatedPlainObject,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.update.success",
        }),
      );
    });

    it("should return void", async () => {
      mockPrismaClient.session.update.mockResolvedValue(mockPrismaSession);
      const result = await repository.update(mockSessionEntity);
      expect(result).toBeUndefined();
    });

    it("should include userId in additional context", async () => {
      mockPrismaClient.session.update.mockResolvedValue(mockPrismaSession);
      (mockSessionEntity.getUserId as jest.Mock).mockReturnValue("update-user-999");

      await repository.update(mockSessionEntity);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "update-user-999",
          }),
        }),
      );
    });

    it("should log error and throw when update fails", async () => {
      const error = new Error("Record to update not found");
      mockPrismaClient.session.update.mockRejectedValue(error);

      await expect(repository.update(mockSessionEntity)).rejects.toThrow("Record to update not found");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.update.error",
          message: "update operation failed",
        }),
      );
    });

    it("should use correct session id from entity", async () => {
      mockPrismaClient.session.update.mockResolvedValue(mockPrismaSession);
      (mockSessionEntity.getId as jest.Mock).mockReturnValue("custom-session-id-555");

      await repository.update(mockSessionEntity);

      expect(mockPrismaClient.session.update).toHaveBeenCalledWith({
        where: { id: "custom-session-id-555" },
        data: expect.any(Object),
      });
    });

    it("should handle concurrent update conflicts", async () => {
      const error = new Error("Concurrent update conflict");
      mockPrismaClient.session.update.mockRejectedValue(error);

      await expect(repository.update(mockSessionEntity)).rejects.toThrow("Concurrent update conflict");
    });
  });

  describe("findById", () => {
    it("should find session by id and return entity", async () => {
      mockPrismaClient.session.findUnique.mockResolvedValue(mockPrismaSession);

      const result = await repository.findById("session-123");

      expect(mockPrismaClient.session.findUnique).toHaveBeenCalledWith({
        where: { id: "session-123" },
      });
      expect(Session.rebuild).toHaveBeenCalledWith(mockPrismaSession);
      expect(result).toBe(mockSessionEntity);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.findById.success",
        }),
      );
    });

    it("should return null when session is not found", async () => {
      mockPrismaClient.session.findUnique.mockResolvedValue(null);

      const result = await repository.findById("non-existent-session");

      expect(result).toBeNull();
      expect(Session.rebuild).not.toHaveBeenCalled();
    });

    it("should include sessionId in additional context", async () => {
      mockPrismaClient.session.findUnique.mockResolvedValue(mockPrismaSession);

      await repository.findById("test-session-999");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionId: "test-session-999",
          }),
        }),
      );
    });

    it("should log error and throw when findUnique fails", async () => {
      const error = new Error("Query execution failed");
      mockPrismaClient.session.findUnique.mockRejectedValue(error);

      await expect(repository.findById("session-123")).rejects.toThrow("Query execution failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.findById.error",
          message: "findById operation failed",
        }),
      );
    });

    it("should handle network timeout errors", async () => {
      const error = new Error("Query timeout");
      mockPrismaClient.session.findUnique.mockRejectedValue(error);

      await expect(repository.findById("session-123")).rejects.toThrow("Query timeout");
    });
  });

  describe("revokeTokenFamily", () => {
    it("should revoke all sessions in token family without reason", async () => {
      mockPrismaClient.session.updateMany.mockResolvedValue({ count: 3 });

      await repository.revokeTokenFamily("family-789");

      expect(mockPrismaClient.session.updateMany).toHaveBeenCalledWith({
        where: { tokenFamily: "family-789", revokedAt: null },
        data: {
          revokedAt: expect.any(Date),
          revokeReason: undefined,
        },
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.revokeTokenFamily.success",
        }),
      );
    });

    it("should revoke all sessions in token family with reason", async () => {
      mockPrismaClient.session.updateMany.mockResolvedValue({ count: 2 });

      await repository.revokeTokenFamily("family-123", "Token theft detected");

      expect(mockPrismaClient.session.updateMany).toHaveBeenCalledWith({
        where: { tokenFamily: "family-123", revokedAt: null },
        data: {
          revokedAt: expect.any(Date),
          revokeReason: "Token theft detected",
        },
      });
    });

    it("should return void", async () => {
      mockPrismaClient.session.updateMany.mockResolvedValue({ count: 1 });
      const result = await repository.revokeTokenFamily("family-789");
      expect(result).toBeUndefined();
    });

    it("should include tokenFamily in additional context", async () => {
      mockPrismaClient.session.updateMany.mockResolvedValue({ count: 1 });

      await repository.revokeTokenFamily("specific-family-456");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tokenFamily: "specific-family-456",
          }),
        }),
      );
    });

    it("should log error and throw when updateMany fails", async () => {
      const error = new Error("Update failed");
      mockPrismaClient.session.updateMany.mockRejectedValue(error);

      await expect(repository.revokeTokenFamily("family-789", "Security breach")).rejects.toThrow("Update failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.revokeTokenFamily.error",
          message: "revokeTokenFamily operation failed",
        }),
      );
    });

    it("should only revoke non-revoked sessions", async () => {
      mockPrismaClient.session.updateMany.mockResolvedValue({ count: 5 });

      await repository.revokeTokenFamily("family-999");

      expect(mockPrismaClient.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            revokedAt: null,
          }),
        }),
      );
    });

    it("should set revokedAt to current date", async () => {
      const beforeDate = new Date();
      mockPrismaClient.session.updateMany.mockResolvedValue({ count: 1 });

      await repository.revokeTokenFamily("family-789");

      const afterDate = new Date();
      const callArgs = mockPrismaClient.session.updateMany.mock.calls[0][0];
      const revokedAt = callArgs.data.revokedAt;

      expect(revokedAt).toBeInstanceOf(Date);
      expect(revokedAt.getTime()).toBeGreaterThanOrEqual(beforeDate.getTime());
      expect(revokedAt.getTime()).toBeLessThanOrEqual(afterDate.getTime());
    });

    it("should handle revoking empty token family", async () => {
      mockPrismaClient.session.updateMany.mockResolvedValue({ count: 0 });

      await repository.revokeTokenFamily("empty-family");

      expect(mockPrismaClient.session.updateMany).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe("revokeAllSessionsForUser", () => {
    it("should revoke all sessions for user", async () => {
      mockPrismaClient.session.updateMany.mockResolvedValue({ count: 5 });

      await repository.revokeAllSessionsForUser("user-456", "User requested logout");

      expect(mockPrismaClient.session.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-456", revokedAt: null },
        data: {
          revokedAt: expect.any(Date),
          revokeReason: "User requested logout",
        },
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.revokeAllSessions.success",
        }),
      );
    });

    it("should return void", async () => {
      mockPrismaClient.session.updateMany.mockResolvedValue({ count: 3 });
      const result = await repository.revokeAllSessionsForUser("user-456", "Security reason");
      expect(result).toBeUndefined();
    });

    it("should include userId in additional context", async () => {
      mockPrismaClient.session.updateMany.mockResolvedValue({ count: 2 });

      await repository.revokeAllSessionsForUser("user-999", "Account compromised");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-999",
          }),
        }),
      );
    });

    it("should log error and throw when updateMany fails", async () => {
      const error = new Error("Database error");
      mockPrismaClient.session.updateMany.mockRejectedValue(error);

      await expect(repository.revokeAllSessionsForUser("user-456", "Reason")).rejects.toThrow("Database error");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.revokeAllSessions.error",
          message: "revokeAllSessions operation failed",
        }),
      );
    });

    it("should only revoke non-revoked sessions for user", async () => {
      mockPrismaClient.session.updateMany.mockResolvedValue({ count: 3 });

      await repository.revokeAllSessionsForUser("user-123", "Password changed");

      expect(mockPrismaClient.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            revokedAt: null,
          }),
        }),
      );
    });

    it("should set revokedAt to current date", async () => {
      const beforeDate = new Date();
      mockPrismaClient.session.updateMany.mockResolvedValue({ count: 1 });

      await repository.revokeAllSessionsForUser("user-456", "Test reason");

      const afterDate = new Date();
      const callArgs = mockPrismaClient.session.updateMany.mock.calls[0][0];
      const revokedAt = callArgs.data.revokedAt;

      expect(revokedAt).toBeInstanceOf(Date);
      expect(revokedAt.getTime()).toBeGreaterThanOrEqual(beforeDate.getTime());
      expect(revokedAt.getTime()).toBeLessThanOrEqual(afterDate.getTime());
    });

    it("should require revokeReason parameter", async () => {
      mockPrismaClient.session.updateMany.mockResolvedValue({ count: 1 });

      await repository.revokeAllSessionsForUser("user-456", "Required reason");

      expect(mockPrismaClient.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            revokeReason: "Required reason",
          }),
        }),
      );
    });

    it("should handle user with no sessions", async () => {
      mockPrismaClient.session.updateMany.mockResolvedValue({ count: 0 });

      await repository.revokeAllSessionsForUser("user-no-sessions", "Test");

      expect(mockPrismaClient.session.updateMany).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it("should handle different revoke reasons", async () => {
      mockPrismaClient.session.updateMany.mockResolvedValue({ count: 1 });

      const reasons = ["Password changed", "Account compromised", "User logout", "Admin action"];

      for (const reason of reasons) {
        jest.clearAllMocks();
        await repository.revokeAllSessionsForUser("user-456", reason);

        expect(mockPrismaClient.session.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              revokeReason: reason,
            }),
          }),
        );
      }
    });
  });

  describe("toEntity (private method)", () => {
    it("should convert PrismaSession to Session entity", async () => {
      mockPrismaClient.session.findUnique.mockResolvedValue(mockPrismaSession);

      await repository.findById("session-123");

      expect(Session.rebuild).toHaveBeenCalledWith(mockPrismaSession);
    });

    it("should handle session with revoked status", async () => {
      const revokedSession = {
        ...mockPrismaSession,
        revokedAt: new Date("2024-02-01"),
        revokeReason: "Token theft",
      };
      mockPrismaClient.session.findUnique.mockResolvedValue(revokedSession);

      await repository.findById("revoked-session");

      expect(Session.rebuild).toHaveBeenCalledWith(revokedSession);
    });

    it("should handle session with all fields populated", async () => {
      const fullSession = {
        id: "session-full",
        tokenHash: "hash-full",
        tokenFamily: "family-full",
        userId: "user-full",
        expiresAt: new Date("2025-01-01"),
        revokedAt: new Date("2024-02-15"),
        revokeReason: "Security measure",
        ipAddress: "10.0.0.1",
        userAgent: "Chrome/120.0",
        deviceId: "device-xyz-789",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-02-15"),
      };
      mockPrismaClient.session.findUnique.mockResolvedValue(fullSession);

      await repository.findById("full-session");

      expect(Session.rebuild).toHaveBeenCalledWith(fullSession);
    });

    it("should handle session with null optional fields", async () => {
      const minimalSession = {
        id: "session-minimal",
        tokenHash: "hash-minimal",
        tokenFamily: "family-minimal",
        userId: "user-minimal",
        expiresAt: new Date("2024-12-31"),
        revokedAt: null,
        revokeReason: null,
        ipAddress: null,
        userAgent: null,
        deviceId: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };
      mockPrismaClient.session.findUnique.mockResolvedValue(minimalSession);

      await repository.findById("minimal-session");

      expect(Session.rebuild).toHaveBeenCalledWith(minimalSession);
    });
  });

  describe("integration with transaction", () => {
    it("should use transaction prisma client when in transaction", async () => {
      const mockTransactionPrisma = {
        session: {
          findUnique: jest.fn().mockResolvedValue(mockPrismaSession),
        },
      };
      const txContext = new PrismaTransactionContext(mockTransactionPrisma as any);
      const txRepo = new PrismaSessionRepository(mockLogger, mockDbClient, txContext);

      await txRepo.findById("session-123");

      expect(mockTransactionPrisma.session.findUnique).toHaveBeenCalledWith({
        where: { id: "session-123" },
      });
      expect(mockPrismaClient.session.findUnique).not.toHaveBeenCalled();
    });

    it("should execute insert in transaction", async () => {
      const mockTransactionPrisma = {
        session: {
          create: jest.fn().mockResolvedValue(mockPrismaSession),
        },
      };
      const txContext = new PrismaTransactionContext(mockTransactionPrisma as any);
      const txRepo = repository.withTransaction(txContext);

      await txRepo.insert(mockSessionEntity);

      expect(mockTransactionPrisma.session.create).toHaveBeenCalled();
    });

    it("should execute revokeTokenFamily in transaction", async () => {
      const mockTransactionPrisma = {
        session: {
          updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      };
      const txContext = new PrismaTransactionContext(mockTransactionPrisma as any);
      const txRepo = repository.withTransaction(txContext);

      await txRepo.revokeTokenFamily("family-789", "Test reason");

      expect(mockTransactionPrisma.session.updateMany).toHaveBeenCalled();
    });
  });

  describe("error scenarios", () => {
    it("should handle network errors", async () => {
      const error = new Error("ECONNREFUSED");
      mockPrismaClient.session.findUnique.mockRejectedValue(error);

      await expect(repository.findById("session-123")).rejects.toThrow("ECONNREFUSED");
    });

    it("should handle foreign key constraint violations", async () => {
      const error = new Error("Foreign key constraint failed");
      mockPrismaClient.session.create.mockRejectedValue(error);

      await expect(repository.insert(mockSessionEntity)).rejects.toThrow("Foreign key constraint failed");
    });

    it("should handle Prisma client not available", async () => {
      mockDbClient.getPrismaClient.mockRejectedValue(new Error("Prisma client not available"));

      await expect(repository.findById("session-123")).rejects.toThrow("Prisma client not available");
    });
  });

  describe("logging behavior", () => {
    it("should log with correct context for all operations", async () => {
      mockPrismaClient.session.findUnique.mockResolvedValue(mockPrismaSession);

      await repository.findById("session-123");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "PrismaSessionRepository",
        }),
      );
    });

    it("should measure operation duration", async () => {
      mockPrismaClient.session.create.mockResolvedValue(mockPrismaSession);

      await repository.insert(mockSessionEntity);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: expect.any(Number),
        }),
      );
    });

    it("should log errors with stack trace", async () => {
      const error = new Error("Test error");
      error.stack = "Error stack trace here";
      mockPrismaClient.session.update.mockRejectedValue(error);

      await expect(repository.update(mockSessionEntity)).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: "Error stack trace here",
        }),
      );
    });
  });

  describe("edge cases", () => {
    it("should handle session with very old dates", async () => {
      const oldDate = new Date("1970-01-01");
      const sessionWithOldDates = {
        ...mockPrismaSession,
        createdAt: oldDate,
        updatedAt: oldDate,
        expiresAt: oldDate,
      };
      mockPrismaClient.session.findUnique.mockResolvedValue(sessionWithOldDates);

      await repository.findById("session-123");

      expect(Session.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: oldDate,
          updatedAt: oldDate,
          expiresAt: oldDate,
        }),
      );
    });

    it("should handle session with very future dates", async () => {
      const futureDate = new Date("2099-12-31");
      const sessionWithFutureDates = {
        ...mockPrismaSession,
        createdAt: futureDate,
        updatedAt: futureDate,
        expiresAt: futureDate,
      };
      mockPrismaClient.session.findUnique.mockResolvedValue(sessionWithFutureDates);

      await repository.findById("session-123");

      expect(Session.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: futureDate,
          updatedAt: futureDate,
          expiresAt: futureDate,
        }),
      );
    });

    it("should handle session with empty string values", async () => {
      const sessionWithEmptyStrings = {
        ...mockPrismaSession,
        ipAddress: "",
        userAgent: "",
        deviceId: "",
      };
      mockPrismaClient.session.findUnique.mockResolvedValue(sessionWithEmptyStrings);

      await repository.findById("session-123");

      expect(Session.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: "",
          userAgent: "",
          deviceId: "",
        }),
      );
    });

    it("should handle revokeTokenFamily with undefined reason", async () => {
      mockPrismaClient.session.updateMany.mockResolvedValue({ count: 1 });

      await repository.revokeTokenFamily("family-789");

      expect(mockPrismaClient.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            revokeReason: undefined,
          }),
        }),
      );
    });
  });
});
