import { PrismaPaymentTransactionRepository } from "@/infrastructure/database/repositories/prisma-payment-transaction.repository";
import { PrismaDatabaseClient } from "@/infrastructure/database/prisma-database-client";
import { PrismaTransactionContext } from "@/infrastructure/database/prisma-transaction-context";
import { Logger } from "@/application/ports/driven/logger";
import { TransactionContext } from "@/application/ports/driven/database";
import { PaymentTransaction } from "@/domain/entities/payment-transaction.entity";
import { PaymentTransactionStatus } from "@/domain/types/payment-transaction-status.enum";
import { PaymentMethod } from "@/domain/types/payment-method.enum";
import { PaymentTransactionType } from "@/domain/types/payment-transaction-type.enum";
import { Prisma } from "../../../../../prisma/generated";

describe("PrismaPaymentTransactionRepository", () => {
  let repository: PrismaPaymentTransactionRepository;
  let mockLogger: jest.Mocked<Logger>;
  let mockDbClient: jest.Mocked<PrismaDatabaseClient>;
  let mockPrismaClient: jest.Mocked<any>;

  const mockTransactionId = "txn-123";
  const mockOrderId = "order-456";
  const mockAmount = 230000;
  const mockMethod = PaymentMethod.CARD;
  const mockProvider = "Midtrans";
  const mockProviderReferenceId = "ref-789";
  const mockParentTransactionId = "parent-123";
  const mockFailureReason = "Payment declined";
  const mockMetadata = { customer: "John Doe", note: "Test payment" };
  const mockCreatedAt = new Date("2024-01-01T10:00:00.000Z");
  const mockUpdatedAt = new Date("2024-01-01T11:00:00.000Z");
  const mockCompletedAt = new Date("2024-01-01T10:30:00.000Z");

  const mockPrismaPaymentTransaction = {
    id: mockTransactionId,
    orderId: mockOrderId,
    type: PaymentTransactionType.CHARGE,
    amount: mockAmount,
    method: mockMethod,
    status: PaymentTransactionStatus.SUCCESS,
    provider: mockProvider,
    providerReferenceId: mockProviderReferenceId,
    parentTransactionId: mockParentTransactionId,
    failureReason: null,
    metadata: mockMetadata,
    completedAt: mockCompletedAt,
    createdAt: mockCreatedAt,
    updatedAt: mockUpdatedAt,
  };

  const mockPaymentTransactionEntity = {
    getId: jest.fn().mockReturnValue(mockTransactionId),
    getOrderId: jest.fn().mockReturnValue(mockOrderId),
    getType: jest.fn().mockReturnValue(PaymentTransactionType.CHARGE),
    getAmount: jest.fn().mockReturnValue({ getAmount: jest.fn().mockReturnValue(mockAmount) }),
    getMethod: jest.fn().mockReturnValue(mockMethod),
    getStatus: jest.fn().mockReturnValue(PaymentTransactionStatus.SUCCESS),
    getProvider: jest.fn().mockReturnValue(mockProvider),
    getProviderReferenceId: jest.fn().mockReturnValue(mockProviderReferenceId),
    getParentTransactionId: jest.fn().mockReturnValue(mockParentTransactionId),
    getFailureReason: jest.fn().mockReturnValue(null),
    getMetadata: jest.fn().mockReturnValue(mockMetadata),
    getCompletedAt: jest.fn().mockReturnValue(mockCompletedAt),
    getCreatedAt: jest.fn().mockReturnValue(mockCreatedAt),
    getUpdatedAt: jest.fn().mockReturnValue(mockUpdatedAt),
  } as unknown as jest.Mocked<PaymentTransaction>;

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
      paymentTransaction: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    mockDbClient = {
      getPrismaClient: jest.fn().mockReturnValue(mockPrismaClient),
      executeInTransaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaDatabaseClient>;

    jest.spyOn(PaymentTransaction, "rebuild").mockReturnValue(mockPaymentTransactionEntity);

    repository = new PrismaPaymentTransactionRepository(mockLogger, mockDbClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with logger and dbClient", () => {
      const repo = new PrismaPaymentTransactionRepository(mockLogger, mockDbClient);
      expect(repo).toBeInstanceOf(PrismaPaymentTransactionRepository);
    });

    it("should initialize with transaction context", () => {
      const mockPrismaTransaction = { paymentTransaction: { findUnique: jest.fn() } } as any;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);
      const repo = new PrismaPaymentTransactionRepository(mockLogger, mockDbClient, txContext);
      expect(repo).toBeInstanceOf(PrismaPaymentTransactionRepository);
    });

    it("should set repositoryName correctly", () => {
      expect((repository as any).repositoryName).toBe("PrismaPaymentTransactionRepository");
    });
  });

  describe("withTransaction", () => {
    it("should create new repository instance with transaction context", () => {
      const mockPrismaTransaction = { paymentTransaction: { findUnique: jest.fn() } } as any;
      const txContext = new PrismaTransactionContext(mockPrismaTransaction);
      const txRepo = repository.withTransaction(txContext);
      expect(txRepo).toBeInstanceOf(PrismaPaymentTransactionRepository);
      expect(txRepo).not.toBe(repository);
    });

    it("should throw error for invalid transaction context", () => {
      const invalidTx = {} as TransactionContext;
      expect(() => {
        repository.withTransaction(invalidTx);
      }).toThrow("Invalid transaction context for PrismaPaymentTransactionRepository. Expected PrismaTransactionContext.");
    });
  });

  describe("insert", () => {
    it("should insert payment transaction successfully", async () => {
      mockPrismaClient.paymentTransaction.create.mockResolvedValue(mockPrismaPaymentTransaction);

      await repository.insert(mockPaymentTransactionEntity);

      expect(mockPrismaClient.paymentTransaction.create).toHaveBeenCalledWith({
        data: {
          id: mockTransactionId,
          orderId: mockOrderId,
          type: PaymentTransactionType.CHARGE,
          amount: mockAmount,
          provider: mockProvider,
          parentTransactionId: mockParentTransactionId,
          status: PaymentTransactionStatus.SUCCESS,
          method: mockMethod,
          providerReferenceId: mockProviderReferenceId,
          failureReason: null,
          completedAt: mockCompletedAt,
          metadata: mockMetadata,
          updatedAt: mockUpdatedAt,
          createdAt: mockCreatedAt,
        },
      });
    });

    it("should insert transaction with null metadata", async () => {
      const transactionWithNullMetadata = {
        ...mockPaymentTransactionEntity,
        getMetadata: jest.fn().mockReturnValue(null),
      } as unknown as jest.Mocked<PaymentTransaction>;

      mockPrismaClient.paymentTransaction.create.mockResolvedValue({
        ...mockPrismaPaymentTransaction,
        metadata: null,
      });

      await repository.insert(transactionWithNullMetadata);

      expect(mockPrismaClient.paymentTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: Prisma.JsonNull,
        }),
      });
    });

    it("should insert transaction with null parentTransactionId", async () => {
      const transactionWithoutParent = {
        ...mockPaymentTransactionEntity,
        getParentTransactionId: jest.fn().mockReturnValue(null),
      } as unknown as jest.Mocked<PaymentTransaction>;

      mockPrismaClient.paymentTransaction.create.mockResolvedValue({
        ...mockPrismaPaymentTransaction,
        parentTransactionId: null,
      });

      await repository.insert(transactionWithoutParent);

      expect(mockPrismaClient.paymentTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentTransactionId: null,
        }),
      });
    });

    it("should insert transaction with null failureReason", async () => {
      const transactionWithoutFailure = {
        ...mockPaymentTransactionEntity,
        getFailureReason: jest.fn().mockReturnValue(null),
      } as unknown as jest.Mocked<PaymentTransaction>;

      mockPrismaClient.paymentTransaction.create.mockResolvedValue({
        ...mockPrismaPaymentTransaction,
        failureReason: null,
      });

      await repository.insert(transactionWithoutFailure);

      expect(mockPrismaClient.paymentTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          failureReason: null,
        }),
      });
    });

    it("should insert transaction with null completedAt", async () => {
      const transactionWithoutCompletion = {
        ...mockPaymentTransactionEntity,
        getCompletedAt: jest.fn().mockReturnValue(null),
      } as unknown as jest.Mocked<PaymentTransaction>;

      mockPrismaClient.paymentTransaction.create.mockResolvedValue({
        ...mockPrismaPaymentTransaction,
        completedAt: null,
      });

      await repository.insert(transactionWithoutCompletion);

      expect(mockPrismaClient.paymentTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          completedAt: null,
        }),
      });
    });
  });

  describe("update", () => {
    it("should update payment transaction successfully", async () => {
      mockPrismaClient.paymentTransaction.update.mockResolvedValue(mockPrismaPaymentTransaction);

      await repository.update(mockPaymentTransactionEntity);

      expect(mockPrismaClient.paymentTransaction.update).toHaveBeenCalledWith({
        where: { id: mockTransactionId },
        data: {
          status: PaymentTransactionStatus.SUCCESS,
          method: mockMethod,
          providerReferenceId: mockProviderReferenceId,
          failureReason: null,
          completedAt: mockCompletedAt,
          metadata: mockMetadata,
          updatedAt: mockUpdatedAt,
        },
      });
    });

    it("should update transaction status to FAILED", async () => {
      const failedTransaction = {
        ...mockPaymentTransactionEntity,
        getStatus: jest.fn().mockReturnValue(PaymentTransactionStatus.FAILED),
        getFailureReason: jest.fn().mockReturnValue(mockFailureReason),
        getCompletedAt: jest.fn().mockReturnValue(null),
      } as unknown as jest.Mocked<PaymentTransaction>;

      mockPrismaClient.paymentTransaction.update.mockResolvedValue({
        ...mockPrismaPaymentTransaction,
        status: PaymentTransactionStatus.FAILED,
        failureReason: mockFailureReason,
        completedAt: null,
      });

      await repository.update(failedTransaction);

      expect(mockPrismaClient.paymentTransaction.update).toHaveBeenCalledWith({
        where: { id: mockTransactionId },
        data: {
          status: PaymentTransactionStatus.FAILED,
          method: mockMethod,
          providerReferenceId: mockProviderReferenceId,
          failureReason: mockFailureReason,
          completedAt: null,
          metadata: mockMetadata,
          updatedAt: mockUpdatedAt,
        },
      });
    });

    it("should update transaction with null metadata", async () => {
      const transactionWithNullMetadata = {
        ...mockPaymentTransactionEntity,
        getMetadata: jest.fn().mockReturnValue(null),
      } as unknown as jest.Mocked<PaymentTransaction>;

      mockPrismaClient.paymentTransaction.update.mockResolvedValue({
        ...mockPrismaPaymentTransaction,
        metadata: null,
      });

      await repository.update(transactionWithNullMetadata);

      expect(mockPrismaClient.paymentTransaction.update).toHaveBeenCalledWith({
        where: { id: mockTransactionId },
        data: expect.objectContaining({
          metadata: Prisma.JsonNull,
        }),
      });
    });

    it("should update transaction with null providerReferenceId", async () => {
      const transactionWithoutRef = {
        ...mockPaymentTransactionEntity,
        getProviderReferenceId: jest.fn().mockReturnValue(null),
      } as unknown as jest.Mocked<PaymentTransaction>;

      mockPrismaClient.paymentTransaction.update.mockResolvedValue({
        ...mockPrismaPaymentTransaction,
        providerReferenceId: null,
      });

      await repository.update(transactionWithoutRef);

      expect(mockPrismaClient.paymentTransaction.update).toHaveBeenCalledWith({
        where: { id: mockTransactionId },
        data: expect.objectContaining({
          providerReferenceId: null,
        }),
      });
    });
  });

  describe("findById", () => {
    it("should find payment transaction by id", async () => {
      mockPrismaClient.paymentTransaction.findUnique.mockResolvedValue(mockPrismaPaymentTransaction);

      const result = await repository.findById(mockTransactionId);

      expect(mockPrismaClient.paymentTransaction.findUnique).toHaveBeenCalledWith({
        where: { id: mockTransactionId },
      });
      expect(PaymentTransaction.rebuild).toHaveBeenCalled();
      expect(result).toBe(mockPaymentTransactionEntity);
    });

    it("should return null when transaction is not found", async () => {
      mockPrismaClient.paymentTransaction.findUnique.mockResolvedValue(null);

      const result = await repository.findById("non-existent-id");

      expect(result).toBeNull();
      expect(PaymentTransaction.rebuild).not.toHaveBeenCalled();
    });

    it("should handle transaction with null fields", async () => {
      const transactionWithNulls = {
        ...mockPrismaPaymentTransaction,
        method: null,
        providerReferenceId: null,
        parentTransactionId: null,
        failureReason: null,
        metadata: null,
        completedAt: null,
      };
      mockPrismaClient.paymentTransaction.findUnique.mockResolvedValue(transactionWithNulls);

      await repository.findById(mockTransactionId);

      expect(PaymentTransaction.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          method: null,
          providerReferenceId: null,
          parentTransactionId: null,
          failureReason: null,
          metadata: null,
          completedAt: null,
        }),
      );
    });
  });

  describe("findByOrderId", () => {
    it("should find all payment transactions by order id", async () => {
      mockPrismaClient.paymentTransaction.findMany.mockResolvedValue([mockPrismaPaymentTransaction]);

      const result = await repository.findByOrderId(mockOrderId);

      expect(mockPrismaClient.paymentTransaction.findMany).toHaveBeenCalledWith({
        where: { orderId: mockOrderId },
        orderBy: { createdAt: "asc" },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockPaymentTransactionEntity);
    });

    it("should return empty array when no transactions found", async () => {
      mockPrismaClient.paymentTransaction.findMany.mockResolvedValue([]);

      const result = await repository.findByOrderId("non-existent-order");

      expect(result).toEqual([]);
    });

    it("should return transactions sorted by createdAt ascending", async () => {
      const olderTransaction = { ...mockPrismaPaymentTransaction, id: "txn-old", createdAt: new Date("2024-01-01T09:00:00Z") };
      const newerTransaction = { ...mockPrismaPaymentTransaction, id: "txn-new", createdAt: new Date("2024-01-01T11:00:00Z") };
      mockPrismaClient.paymentTransaction.findMany.mockResolvedValue([olderTransaction, newerTransaction]);

      await repository.findByOrderId(mockOrderId);

      expect(mockPrismaClient.paymentTransaction.findMany).toHaveBeenCalledWith({
        where: { orderId: mockOrderId },
        orderBy: { createdAt: "asc" },
      });
    });

    it("should handle multiple transactions with different statuses", async () => {
      const transactions = [
        { ...mockPrismaPaymentTransaction, id: "txn-1", status: PaymentTransactionStatus.PENDING },
        { ...mockPrismaPaymentTransaction, id: "txn-2", status: PaymentTransactionStatus.SUCCESS },
        { ...mockPrismaPaymentTransaction, id: "txn-3", status: PaymentTransactionStatus.FAILED },
      ];
      mockPrismaClient.paymentTransaction.findMany.mockResolvedValue(transactions);

      const result = await repository.findByOrderId(mockOrderId);

      expect(result).toHaveLength(3);
    });
  });

  describe("findByProviderReferenceId", () => {
    it("should find payment transaction by provider reference id", async () => {
      mockPrismaClient.paymentTransaction.findFirst.mockResolvedValue(mockPrismaPaymentTransaction);

      const result = await repository.findByProviderReferenceId(mockProviderReferenceId);

      expect(mockPrismaClient.paymentTransaction.findFirst).toHaveBeenCalledWith({
        where: { providerReferenceId: mockProviderReferenceId },
        orderBy: { createdAt: "desc" },
      });
      expect(PaymentTransaction.rebuild).toHaveBeenCalled();
      expect(result).toBe(mockPaymentTransactionEntity);
    });

    it("should return null when transaction is not found", async () => {
      mockPrismaClient.paymentTransaction.findFirst.mockResolvedValue(null);

      const result = await repository.findByProviderReferenceId("non-existent-ref");

      expect(result).toBeNull();
      expect(PaymentTransaction.rebuild).not.toHaveBeenCalled();
    });

    it("should return the most recent transaction when multiple exist", async () => {
      const olderTransaction = { ...mockPrismaPaymentTransaction, id: "txn-old", createdAt: new Date("2024-01-01T09:00:00Z") };
      const newerTransaction = { ...mockPrismaPaymentTransaction, id: "txn-new", createdAt: new Date("2024-01-01T11:00:00Z") };
      mockPrismaClient.paymentTransaction.findFirst.mockResolvedValue(newerTransaction);

      const result = await repository.findByProviderReferenceId(mockProviderReferenceId);

      expect(mockPrismaClient.paymentTransaction.findFirst).toHaveBeenCalledWith({
        where: { providerReferenceId: mockProviderReferenceId },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toBe(mockPaymentTransactionEntity);
    });

    it("should handle transaction with null metadata", async () => {
      const transactionWithNullMetadata = {
        ...mockPrismaPaymentTransaction,
        metadata: null,
      };
      mockPrismaClient.paymentTransaction.findFirst.mockResolvedValue(transactionWithNullMetadata);

      await repository.findByProviderReferenceId(mockProviderReferenceId);

      expect(PaymentTransaction.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: null,
        }),
      );
    });
  });

  describe("toEntity (private method)", () => {
    it("should convert PrismaPaymentTransaction to PaymentTransaction entity", async () => {
      mockPrismaClient.paymentTransaction.findUnique.mockResolvedValue(mockPrismaPaymentTransaction);

      await repository.findById(mockTransactionId);

      expect(PaymentTransaction.rebuild).toHaveBeenCalledWith({
        id: mockTransactionId,
        orderId: mockOrderId,
        status: PaymentTransactionStatus.SUCCESS,
        method: mockMethod,
        type: PaymentTransactionType.CHARGE,
        amount: mockAmount,
        provider: mockProvider,
        parentTransactionId: mockParentTransactionId,
        providerReferenceId: mockProviderReferenceId,
        failureReason: null,
        completedAt: mockCompletedAt,
        metadata: mockMetadata,
        createdAt: mockCreatedAt,
        updatedAt: mockUpdatedAt,
      });
    });

    it("should handle transaction with null method", async () => {
      const transactionWithNullMethod = {
        ...mockPrismaPaymentTransaction,
        method: null,
      };
      mockPrismaClient.paymentTransaction.findUnique.mockResolvedValue(transactionWithNullMethod);

      await repository.findById(mockTransactionId);

      expect(PaymentTransaction.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          method: null,
        }),
      );
    });

    it("should handle transaction with null providerReferenceId", async () => {
      const transactionWithoutRef = {
        ...mockPrismaPaymentTransaction,
        providerReferenceId: null,
      };
      mockPrismaClient.paymentTransaction.findUnique.mockResolvedValue(transactionWithoutRef);

      await repository.findById(mockTransactionId);

      expect(PaymentTransaction.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          providerReferenceId: null,
        }),
      );
    });

    it("should handle transaction with null parentTransactionId", async () => {
      const transactionWithoutParent = {
        ...mockPrismaPaymentTransaction,
        parentTransactionId: null,
      };
      mockPrismaClient.paymentTransaction.findUnique.mockResolvedValue(transactionWithoutParent);

      await repository.findById(mockTransactionId);

      expect(PaymentTransaction.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          parentTransactionId: null,
        }),
      );
    });

    it("should handle transaction with null completedAt", async () => {
      const transactionWithoutCompletion = {
        ...mockPrismaPaymentTransaction,
        completedAt: null,
      };
      mockPrismaClient.paymentTransaction.findUnique.mockResolvedValue(transactionWithoutCompletion);

      await repository.findById(mockTransactionId);

      expect(PaymentTransaction.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          completedAt: null,
        }),
      );
    });

    it("should handle transaction with metadata as null", async () => {
      const transactionWithNullMetadata = {
        ...mockPrismaPaymentTransaction,
        metadata: null,
      };
      mockPrismaClient.paymentTransaction.findUnique.mockResolvedValue(transactionWithNullMetadata);

      await repository.findById(mockTransactionId);

      expect(PaymentTransaction.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: null,
        }),
      );
    });

    it("should handle transaction with different statuses", async () => {
      const statuses = ["PENDING", "SUCCESS", "FAILED", "EXPIRED", "CANCELLED"];

      for (const status of statuses) {
        const transactionWithStatus = {
          ...mockPrismaPaymentTransaction,
          status,
        };
        mockPrismaClient.paymentTransaction.findUnique.mockResolvedValue(transactionWithStatus);

        await repository.findById(mockTransactionId);

        expect(PaymentTransaction.rebuild).toHaveBeenCalledWith(
          expect.objectContaining({
            status: status,
          }),
        );
      }
    });

    it("should handle transaction with different types", async () => {
      const types = ["CHARGE", "REFUND"];

      for (const type of types) {
        const transactionWithType = {
          ...mockPrismaPaymentTransaction,
          type,
        };
        mockPrismaClient.paymentTransaction.findUnique.mockResolvedValue(transactionWithType);

        await repository.findById(mockTransactionId);

        expect(PaymentTransaction.rebuild).toHaveBeenCalledWith(
          expect.objectContaining({
            type: type,
          }),
        );
      }
    });
  });

  describe("toJsonInput (private method)", () => {
    it("should return JsonNull when metadata is null", async () => {
      const transactionWithNullMetadata = {
        ...mockPaymentTransactionEntity,
        getMetadata: jest.fn().mockReturnValue(null),
      } as unknown as jest.Mocked<PaymentTransaction>;

      mockPrismaClient.paymentTransaction.create.mockResolvedValue(mockPrismaPaymentTransaction);

      await repository.insert(transactionWithNullMetadata);

      expect(mockPrismaClient.paymentTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: Prisma.JsonNull,
        }),
      });
    });

    it("should return metadata as Prisma.InputJsonValue when metadata exists", async () => {
      mockPrismaClient.paymentTransaction.create.mockResolvedValue(mockPrismaPaymentTransaction);

      await repository.insert(mockPaymentTransactionEntity);

      expect(mockPrismaClient.paymentTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: mockMetadata,
        }),
      });
    });
  });

  describe("integration with transaction", () => {
    it("should use transaction prisma client when in transaction", async () => {
      const mockTransactionPrisma = {
        paymentTransaction: {
          findUnique: jest.fn().mockResolvedValue(mockPrismaPaymentTransaction),
        },
      };
      const txContext = new PrismaTransactionContext(mockTransactionPrisma as any);
      const txRepo = new PrismaPaymentTransactionRepository(mockLogger, mockDbClient, txContext);

      await txRepo.findById(mockTransactionId);

      expect(mockTransactionPrisma.paymentTransaction.findUnique).toHaveBeenCalled();
      expect(mockPrismaClient.paymentTransaction.findUnique).not.toHaveBeenCalled();
    });

    it("should execute insert in transaction", async () => {
      const mockTransactionPrisma = {
        paymentTransaction: {
          create: jest.fn().mockResolvedValue(mockPrismaPaymentTransaction),
        },
      };
      const txContext = new PrismaTransactionContext(mockTransactionPrisma as any);
      const txRepo = repository.withTransaction(txContext);

      await txRepo.insert(mockPaymentTransactionEntity);

      expect(mockTransactionPrisma.paymentTransaction.create).toHaveBeenCalled();
    });

    it("should execute update in transaction", async () => {
      const mockTransactionPrisma = {
        paymentTransaction: {
          update: jest.fn().mockResolvedValue(mockPrismaPaymentTransaction),
        },
      };
      const txContext = new PrismaTransactionContext(mockTransactionPrisma as any);
      const txRepo = repository.withTransaction(txContext);

      await txRepo.update(mockPaymentTransactionEntity);

      expect(mockTransactionPrisma.paymentTransaction.update).toHaveBeenCalled();
    });

    it("should execute findByOrderId in transaction", async () => {
      const mockTransactionPrisma = {
        paymentTransaction: {
          findMany: jest.fn().mockResolvedValue([mockPrismaPaymentTransaction]),
        },
      };
      const txContext = new PrismaTransactionContext(mockTransactionPrisma as any);
      const txRepo = repository.withTransaction(txContext);

      await txRepo.findByOrderId(mockOrderId);

      expect(mockTransactionPrisma.paymentTransaction.findMany).toHaveBeenCalled();
    });
  });

  describe("error scenarios", () => {
    it("should handle database connection errors in findById", async () => {
      const error = new Error("ECONNREFUSED");
      mockPrismaClient.paymentTransaction.findUnique.mockRejectedValue(error);

      await expect(repository.findById(mockTransactionId)).rejects.toThrow("ECONNREFUSED");
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should handle foreign key constraint errors in insert", async () => {
      const error = new Error("Foreign key constraint failed");
      mockPrismaClient.paymentTransaction.create.mockRejectedValue(error);

      await expect(repository.insert(mockPaymentTransactionEntity)).rejects.toThrow("Foreign key constraint failed");
    });

    it("should handle Prisma client not available", async () => {
      mockDbClient.getPrismaClient.mockRejectedValue(new Error("Prisma client not available"));

      await expect(repository.findById(mockTransactionId)).rejects.toThrow("Prisma client not available");
    });

    it("should handle update error", async () => {
      const error = new Error("Update failed");
      mockPrismaClient.paymentTransaction.update.mockRejectedValue(error);

      await expect(repository.update(mockPaymentTransactionEntity)).rejects.toThrow("Update failed");
    });

    it("should handle duplicate key error in insert", async () => {
      const error = new Error("Unique constraint failed");
      mockPrismaClient.paymentTransaction.create.mockRejectedValue(error);

      await expect(repository.insert(mockPaymentTransactionEntity)).rejects.toThrow("Unique constraint failed");
    });
  });

  describe("logging behavior", () => {
    it("should log with correct context for all operations", async () => {
      mockPrismaClient.paymentTransaction.findUnique.mockResolvedValue(mockPrismaPaymentTransaction);

      await repository.findById(mockTransactionId);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "PrismaPaymentTransactionRepository",
        }),
      );
    });

    it("should measure operation duration", async () => {
      mockPrismaClient.paymentTransaction.findUnique.mockResolvedValue(mockPrismaPaymentTransaction);

      await repository.findById(mockTransactionId);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: expect.any(Number),
        }),
      );
    });

    it("should log errors with stack trace", async () => {
      const error = new Error("Test error");
      error.stack = "Error stack trace here";
      mockPrismaClient.paymentTransaction.update.mockRejectedValue(error);

      await expect(repository.update(mockPaymentTransactionEntity)).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: "Error stack trace here",
        }),
      );
    });
  });

  describe("edge cases", () => {
    it("should handle transaction with very large amount", async () => {
      const largeAmount = 9999999999;
      const transactionWithLargeAmount = {
        ...mockPrismaPaymentTransaction,
        amount: largeAmount,
      };
      mockPrismaClient.paymentTransaction.findUnique.mockResolvedValue(transactionWithLargeAmount);

      await repository.findById(mockTransactionId);

      expect(PaymentTransaction.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: largeAmount,
        }),
      );
    });

    it("should handle transaction with zero amount", async () => {
      const transactionWithZeroAmount = {
        ...mockPrismaPaymentTransaction,
        amount: 0,
      };
      mockPrismaClient.paymentTransaction.findUnique.mockResolvedValue(transactionWithZeroAmount);

      await repository.findById(mockTransactionId);

      expect(PaymentTransaction.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 0,
        }),
      );
    });

    it("should handle transaction with special characters in providerReferenceId", async () => {
      const specialRef = "ref-!@#$%^&*()";
      const transactionWithSpecialRef = {
        ...mockPrismaPaymentTransaction,
        providerReferenceId: specialRef,
      };
      mockPrismaClient.paymentTransaction.findUnique.mockResolvedValue(transactionWithSpecialRef);

      await repository.findById(mockTransactionId);

      expect(PaymentTransaction.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          providerReferenceId: specialRef,
        }),
      );
    });

    it("should handle transaction with very old dates", async () => {
      const oldDate = new Date("1970-01-01T00:00:00.000Z");
      const transactionWithOldDates = {
        ...mockPrismaPaymentTransaction,
        createdAt: oldDate,
        updatedAt: oldDate,
        completedAt: oldDate,
      };
      mockPrismaClient.paymentTransaction.findUnique.mockResolvedValue(transactionWithOldDates);

      await repository.findById(mockTransactionId);

      expect(PaymentTransaction.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: oldDate,
          updatedAt: oldDate,
          completedAt: oldDate,
        }),
      );
    });

    it("should handle transaction with very future dates", async () => {
      const futureDate = new Date("2099-12-31T23:59:59.999Z");
      const transactionWithFutureDates = {
        ...mockPrismaPaymentTransaction,
        createdAt: futureDate,
        updatedAt: futureDate,
        completedAt: futureDate,
      };
      mockPrismaClient.paymentTransaction.findUnique.mockResolvedValue(transactionWithFutureDates);

      await repository.findById(mockTransactionId);

      expect(PaymentTransaction.rebuild).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: futureDate,
          updatedAt: futureDate,
          completedAt: futureDate,
        }),
      );
    });
  });
});
