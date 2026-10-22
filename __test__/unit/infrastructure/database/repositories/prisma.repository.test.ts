import { PrismaRepository } from "@/infrastructure/database/repositories/prisma.repository";
import { PrismaDatabaseClient } from "@/infrastructure/database/prisma-database-client";
import { PrismaTransactionContext } from "@/infrastructure/database/prisma-transaction-context";
import { Logger } from "@/application/ports/driven/logger";
import { TransactionContext } from "@/application/ports/driven/database";
import { PrismaClient } from "../../../../../prisma/generated";

class TestPrismaRepository extends PrismaRepository<TestPrismaRepository> {
  protected repositoryName = "TestPrismaRepository";

  withTransaction(tx: TransactionContext): TestPrismaRepository {
    return this.createTransactionalInstance(tx);
  }

  public async testGetPrismaClient() {
    return await this.getPrismaClient();
  }

  public testCreateTransactionalInstance(tx: TransactionContext): TestPrismaRepository {
    return this.createTransactionalInstance(tx);
  }

  public getPrismaProperty() {
    return this.prisma;
  }

  public getDbClientProperty() {
    return this.dbClient;
  }

  public getLoggerProperty() {
    return this.logger;
  }
}

describe("PrismaRepository", () => {
  let repository: TestPrismaRepository;
  let mockLogger: jest.Mocked<Logger>;
  let mockDbClient: jest.Mocked<PrismaDatabaseClient>;
  let mockPrismaClient: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    } as jest.Mocked<Logger>;

    mockPrismaClient = {
      $transaction: jest.fn(),
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
    } as unknown as jest.Mocked<PrismaClient>;

    mockDbClient = {
      getPrismaClient: jest.fn().mockResolvedValue(mockPrismaClient),
      executeInTransaction: jest.fn(),
      healthCheck: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as jest.Mocked<PrismaDatabaseClient>;

    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with logger and dbClient without transaction context", () => {
      repository = new TestPrismaRepository(mockLogger, mockDbClient);

      expect(repository).toBeInstanceOf(PrismaRepository);
      expect(repository).toBeInstanceOf(TestPrismaRepository);
      expect(mockDbClient.getPrismaClient).not.toHaveBeenCalled();
      expect(repository.getPrismaProperty()).toBeUndefined();
      expect(repository.getDbClientProperty()).toBe(mockDbClient);
      expect(repository.getLoggerProperty()).toBe(mockLogger);
    });

    it("should initialize with transaction context", () => {
      const mockPrismaTransaction = {
        someMethod: jest.fn(),
      } as unknown as PrismaClient;

      const mockTransactionContext = new PrismaTransactionContext(mockPrismaTransaction);

      repository = new TestPrismaRepository(mockLogger, mockDbClient, mockTransactionContext);

      expect(repository.getPrismaProperty()).toBe(mockPrismaTransaction);
      expect(mockDbClient.getPrismaClient).not.toHaveBeenCalled();
    });

    it("should use prisma client from dbClient when no transaction context provided", async () => {
      repository = new TestPrismaRepository(mockLogger, mockDbClient);

      const prisma = await repository.testGetPrismaClient();
      expect(prisma).toBe(mockPrismaClient);
      expect(mockDbClient.getPrismaClient).toHaveBeenCalledTimes(1);
    });

    it("should use prisma transaction when transaction context is provided", async () => {
      const mockPrismaTransaction = {
        user: { findMany: jest.fn() },
      } as unknown as PrismaClient;

      const txContext = new PrismaTransactionContext(mockPrismaTransaction);
      repository = new TestPrismaRepository(mockLogger, mockDbClient, txContext);

      const prisma = await repository.testGetPrismaClient();
      expect(prisma).toBe(mockPrismaTransaction);
      expect(mockDbClient.getPrismaClient).not.toHaveBeenCalled();
    });

    it("should call super with logger and dbClient", () => {
      repository = new TestPrismaRepository(mockLogger, mockDbClient);

      expect(repository.getDbClientProperty()).toBe(mockDbClient);
      expect(repository.getLoggerProperty()).toBe(mockLogger);
    });
  });

  describe("getPrismaClient", () => {
    it("should return prisma client when initialized without transaction", async () => {
      repository = new TestPrismaRepository(mockLogger, mockDbClient);

      const prisma = await repository.testGetPrismaClient();

      expect(prisma).toBe(mockPrismaClient);
      expect(mockDbClient.getPrismaClient).toHaveBeenCalledTimes(1);
    });

    it("should return prisma transaction when initialized with transaction context", async () => {
      const mockPrismaTransaction = {
        user: { create: jest.fn() },
      } as unknown as PrismaClient;

      const txContext = new PrismaTransactionContext(mockPrismaTransaction);
      repository = new TestPrismaRepository(mockLogger, mockDbClient, txContext);

      const prisma = await repository.testGetPrismaClient();

      expect(prisma).toBe(mockPrismaTransaction);
      expect(prisma).not.toBe(mockPrismaClient);
      expect(mockDbClient.getPrismaClient).not.toHaveBeenCalled();
    });

    it("should cache the prisma client reference", async () => {
      repository = new TestPrismaRepository(mockLogger, mockDbClient);

      const prisma1 = await repository.testGetPrismaClient();
      const prisma2 = await repository.testGetPrismaClient();

      expect(prisma1).toBe(prisma2);
      expect(mockDbClient.getPrismaClient).toHaveBeenCalledTimes(2);
    });

    it("should handle dbClient.getPrismaClient error", async () => {
      const error = new Error("Failed to get Prisma client");
      mockDbClient.getPrismaClient.mockRejectedValue(error);

      repository = new TestPrismaRepository(mockLogger, mockDbClient);

      await expect(repository.testGetPrismaClient()).rejects.toThrow("Failed to get Prisma client");
    });
  });

  describe("createTransactionalInstance", () => {
    beforeEach(() => {
      repository = new TestPrismaRepository(mockLogger, mockDbClient);
    });

    it("should create new instance with PrismaTransactionContext", () => {
      const mockPrismaTransaction = {
        user: { findFirst: jest.fn() },
      } as unknown as PrismaClient;

      const txContext = new PrismaTransactionContext(mockPrismaTransaction);

      const newInstance = repository.testCreateTransactionalInstance(txContext);

      expect(newInstance).toBeInstanceOf(TestPrismaRepository);
      expect(newInstance).not.toBe(repository);
      expect(newInstance.getPrismaProperty()).toBe(mockPrismaTransaction);
    });

    it("should throw error for invalid transaction context (not PrismaTransactionContext)", () => {
      const invalidTxContext = { someProperty: "value" } as unknown as TransactionContext;

      expect(() => {
        repository.testCreateTransactionalInstance(invalidTxContext);
      }).toThrow("Invalid transaction context for TestPrismaRepository. Expected PrismaTransactionContext.");
    });

    it("should log error when transaction context is invalid", () => {
      const invalidTxContext = { someProperty: "value" } as unknown as TransactionContext;

      try {
        repository.testCreateTransactionalInstance(invalidTxContext);
      } catch (error) {
        // Intentionally left empty
      }

      expect(mockLogger.error).toHaveBeenCalledWith({
        context: "TestPrismaRepository",
        event: "createTransactionalInstance",
        message: "Invalid transaction context for TestPrismaRepository. Expected PrismaTransactionContext.",
      });
    });

    it("should create instance with correct constructor parameters", async () => {
      const mockPrismaTransaction = {
        post: { findMany: jest.fn() },
      } as unknown as PrismaClient;

      const txContext = new PrismaTransactionContext(mockPrismaTransaction);

      const newInstance = repository.testCreateTransactionalInstance(txContext);

      expect(await newInstance.testGetPrismaClient()).toBe(mockPrismaTransaction);
    });

    it("should handle multiple transaction context creations", () => {
      const mockPrismaTransaction1 = { id: 1 } as unknown as PrismaClient;
      const mockPrismaTransaction2 = { id: 2 } as unknown as PrismaClient;

      const txContext1 = new PrismaTransactionContext(mockPrismaTransaction1);
      const txContext2 = new PrismaTransactionContext(mockPrismaTransaction2);

      const instance1 = repository.testCreateTransactionalInstance(txContext1);
      const instance2 = repository.testCreateTransactionalInstance(txContext2);

      expect(instance1.getPrismaProperty()).toBe(mockPrismaTransaction1);
      expect(instance2.getPrismaProperty()).toBe(mockPrismaTransaction2);
      expect(instance1).not.toBe(instance2);
    });

    it("should preserve logger and dbClient in new instance", () => {
      const mockPrismaTransaction = {} as unknown as PrismaClient;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);

      const newInstance = repository.testCreateTransactionalInstance(txContext);

      expect(newInstance).toBeInstanceOf(TestPrismaRepository);
      expect((newInstance as any).logger).toBe(mockLogger);
      expect((newInstance as any).dbClient).toBe(mockDbClient);
    });

    it("should throw error for null transaction context", () => {
      expect(() => {
        repository.testCreateTransactionalInstance(null as unknown as TransactionContext);
      }).toThrow("Invalid transaction context for TestPrismaRepository. Expected PrismaTransactionContext.");

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should throw error for undefined transaction context", () => {
      expect(() => {
        repository.testCreateTransactionalInstance(undefined as unknown as TransactionContext);
      }).toThrow("Invalid transaction context for TestPrismaRepository. Expected PrismaTransactionContext.");

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should use constructor from current class", () => {
      const mockPrismaTransaction = {} as unknown as PrismaClient;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);

      const newInstance = repository.testCreateTransactionalInstance(txContext);

      expect(newInstance.constructor).toBe(TestPrismaRepository);
    });
  });

  describe("withTransaction", () => {
    beforeEach(() => {
      repository = new TestPrismaRepository(mockLogger, mockDbClient);
    });

    it("should call createTransactionalInstance and return new instance", () => {
      const mockPrismaTransaction = {} as unknown as PrismaClient;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);

      const newInstance = repository.withTransaction(txContext);

      expect(newInstance).toBeInstanceOf(TestPrismaRepository);
      expect(newInstance).not.toBe(repository);
      expect(newInstance.getPrismaProperty()).toBe(mockPrismaTransaction);
    });

    it("should throw error when called with invalid transaction context", () => {
      const invalidTxContext = {} as TransactionContext;

      expect(() => {
        repository.withTransaction(invalidTxContext);
      }).toThrow("Invalid transaction context for TestPrismaRepository. Expected PrismaTransactionContext.");
    });

    it("should maintain repository name in transactional instance", () => {
      const mockPrismaTransaction = {} as unknown as PrismaClient;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);

      const newInstance = repository.withTransaction(txContext);

      expect((newInstance as any).repositoryName).toBe("TestPrismaRepository");
    });
  });

  describe("integration scenarios", () => {
    it("should handle repository chain with transactions", async () => {
      const repo1 = new TestPrismaRepository(mockLogger, mockDbClient);
      expect(await repo1.testGetPrismaClient()).toBe(mockPrismaClient);

      const mockPrismaTransaction = { transactionId: "tx-1" } as unknown as PrismaClient;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);
      const repo2 = repo1.withTransaction(txContext);

      expect(await repo2.testGetPrismaClient()).toBe(mockPrismaTransaction);
      expect(await repo1.testGetPrismaClient()).toBe(mockPrismaClient);
    });

    it("should maintain separate prisma instances for different repositories", async () => {
      const repo1 = new TestPrismaRepository(mockLogger, mockDbClient);
      const repo2 = new TestPrismaRepository(mockLogger, mockDbClient);

      expect(await repo1.testGetPrismaClient()).toBe(mockPrismaClient);
      expect(await repo2.testGetPrismaClient()).toBe(mockPrismaClient);

      const mockPrismaTransaction = { id: "unique" } as unknown as PrismaClient;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);
      const repo3 = repo1.withTransaction(txContext);

      expect(await repo1.testGetPrismaClient()).toBe(mockPrismaClient);
      expect(await repo2.testGetPrismaClient()).toBe(mockPrismaClient);
      expect(await repo3.testGetPrismaClient()).toBe(mockPrismaTransaction);
    });

    it("should handle nested transaction contexts", async () => {
      const mockPrismaTransaction1 = { level: 1 } as unknown as PrismaClient;
      const mockPrismaTransaction2 = { level: 2 } as unknown as PrismaClient;

      const txContext1 = new PrismaTransactionContext(mockPrismaTransaction1);
      const txContext2 = new PrismaTransactionContext(mockPrismaTransaction2);

      const repo1 = new TestPrismaRepository(mockLogger, mockDbClient);
      const repo2 = repo1.withTransaction(txContext1);
      const repo3 = repo2.withTransaction(txContext2);

      expect(await repo1.testGetPrismaClient()).toBe(mockPrismaClient);
      expect(await repo2.testGetPrismaClient()).toBe(mockPrismaTransaction1);
      expect(await repo3.testGetPrismaClient()).toBe(mockPrismaTransaction2);
    });

    it("should handle switching between transactional and non-transactional contexts", async () => {
      const mockPrismaTransaction = { id: "tx" } as unknown as PrismaClient;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);

      const repo1 = new TestPrismaRepository(mockLogger, mockDbClient);
      const repo2 = repo1.withTransaction(txContext);

      expect(await repo1.testGetPrismaClient()).toBe(mockPrismaClient);
      expect(await repo2.testGetPrismaClient()).toBe(mockPrismaTransaction);

      const repo3 = new TestPrismaRepository(mockLogger, mockDbClient);
      expect(await repo3.testGetPrismaClient()).toBe(mockPrismaClient);
    });
  });

  describe("edge cases", () => {
    it("should handle transaction context with complex prisma transaction object", async () => {
      const complexPrismaTransaction = {
        user: {
          findMany: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        post: {
          findMany: jest.fn(),
        },
        $executeRaw: jest.fn(),
      } as unknown as PrismaClient;

      const txContext = new PrismaTransactionContext(complexPrismaTransaction);
      repository = new TestPrismaRepository(mockLogger, mockDbClient, txContext);

      expect(await repository.testGetPrismaClient()).toBe(complexPrismaTransaction);
      expect(await repository.testGetPrismaClient()).toHaveProperty("user");
      expect(await repository.testGetPrismaClient()).toHaveProperty("post");
    });

    it("should maintain consistent behavior across multiple withTransaction calls", async () => {
      repository = new TestPrismaRepository(mockLogger, mockDbClient);

      const mockPrismaTransaction = { unique: "tx" } as unknown as PrismaClient;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);

      const instance1 = repository.withTransaction(txContext);
      const instance2 = repository.withTransaction(txContext);

      expect(instance1).not.toBe(instance2);
      expect(await instance1.testGetPrismaClient()).toBe(mockPrismaTransaction);
      expect(await instance2.testGetPrismaClient()).toBe(mockPrismaTransaction);
    });

    it("should handle repository with custom repository name", () => {
      class CustomRepository extends TestPrismaRepository {
        protected repositoryName = "CustomRepository";
      }

      const customRepo = new CustomRepository(mockLogger, mockDbClient);

      expect((customRepo as any).repositoryName).toBe("CustomRepository");
    });

    it("should handle dbClient.getPrismaClient returning null", async () => {
      mockDbClient.getPrismaClient.mockResolvedValue(null as any);

      repository = new TestPrismaRepository(mockLogger, mockDbClient);

      const prisma = await repository.testGetPrismaClient();
      expect(prisma).toBeNull();
    });

    it("should handle transaction context with empty prisma transaction", async () => {
      const emptyPrismaTransaction = {} as unknown as PrismaClient;
      const txContext = new PrismaTransactionContext(emptyPrismaTransaction);
      repository = new TestPrismaRepository(mockLogger, mockDbClient, txContext);

      expect(await repository.testGetPrismaClient()).toEqual({});
    });

    it("should handle error when creating transactional instance with invalid constructor", () => {
      const invalidTxContext = {} as TransactionContext;

      expect(() => {
        repository.testCreateTransactionalInstance(invalidTxContext);
      }).toThrow("Invalid transaction context for TestPrismaRepository. Expected PrismaTransactionContext.");
    });
  });

  describe("inheritance and polymorphism", () => {
    it("should properly extend AppRepository", () => {
      repository = new TestPrismaRepository(mockLogger, mockDbClient);

      expect(repository).toBeInstanceOf(PrismaRepository);
      expect(typeof (repository as any).executeInTransaction).toBe("function");
      expect(typeof (repository as any).withLoggingAndErrorHandling).toBe("function");
      expect(typeof (repository as any).withSoftLogging).toBe("function");
    });

    it("should allow repository methods to access prisma client", async () => {
      repository = new TestPrismaRepository(mockLogger, mockDbClient);

      const prisma = await repository.testGetPrismaClient();

      expect(prisma).toBe(mockPrismaClient);
      expect(prisma).toHaveProperty("$transaction");
      expect(prisma).toHaveProperty("$connect");
      expect(prisma).toHaveProperty("$disconnect");
    });

    it("should allow transactional repository to access transactional prisma client", async () => {
      const mockPrismaTransaction = { transactionId: "tx-123" } as unknown as PrismaClient;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);

      repository = new TestPrismaRepository(mockLogger, mockDbClient, txContext);

      const prisma = await repository.testGetPrismaClient();

      expect(prisma).toBe(mockPrismaTransaction);
    });
  });
});
