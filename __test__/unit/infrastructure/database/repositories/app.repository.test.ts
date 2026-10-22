import { AppRepository } from "@/infrastructure/database/repositories/app.repository";
import { DatabaseClient, TransactionContext } from "@/application/ports/driven/database";
import { Logger } from "@/application/ports/driven/logger";

class TestRepository extends AppRepository<TestRepository> {
  protected repositoryName = "TestRepository";

  withTransaction(tx: TransactionContext): TestRepository {
    return new TestRepository(this.logger, this.dbClient);
  }

  public async testExecuteInTransaction<R>(operation: (tx: TransactionContext) => Promise<R>): Promise<R> {
    return this.executeInTransaction(operation);
  }

  public async testWithLoggingAndErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string,
    additionalContext?: Record<string, unknown>,
  ): Promise<T> {
    return this.withLoggingAndErrorHandling(operation, operationName, additionalContext);
  }

  public async testWithSoftLogging<T>(operation: () => Promise<T>, operationName: string, additionalContext?: Record<string, unknown>): Promise<T> {
    return this.withSoftLogging(operation, operationName, additionalContext);
  }

  public getRepositoryName(): string {
    return this.repositoryName;
  }
}

describe("AppRepository", () => {
  let repository: TestRepository;
  let mockLogger: jest.Mocked<Logger>;
  let mockDbClient: jest.Mocked<DatabaseClient>;
  let mockTxContext: TransactionContext;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    } as jest.Mocked<Logger>;

    mockDbClient = {
      executeInTransaction: jest.fn(),
      healthCheck: jest.fn(),
      disconnect: jest.fn(),
      getPrismaClient: jest.fn(),
    } as jest.Mocked<DatabaseClient>;

    mockTxContext = {} as TransactionContext;

    repository = new TestRepository(mockLogger, mockDbClient);

    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with logger and dbClient", () => {
      expect(repository).toBeInstanceOf(AppRepository);
      expect(repository).toBeInstanceOf(TestRepository);
    });

    it("should set repositoryName", () => {
      expect(repository.getRepositoryName()).toBe("TestRepository");
    });
  });

  describe("withTransaction", () => {
    it("should return a new instance with transaction context", () => {
      const result = repository.withTransaction(mockTxContext);

      expect(result).toBeInstanceOf(TestRepository);
      expect(result).not.toBe(repository);
    });

    it("should maintain logger and dbClient references", () => {
      const result = repository.withTransaction(mockTxContext);

      expect(result["logger"]).toBe(mockLogger);
      expect(result["dbClient"]).toBe(mockDbClient);
    });
  });

  describe("executeInTransaction", () => {
    it("should execute operation within a transaction", async () => {
      const mockOperation = jest.fn().mockResolvedValue("operation-result");
      mockDbClient.executeInTransaction.mockImplementation(async (op) => op(mockTxContext));

      const result = await repository.testExecuteInTransaction(mockOperation);

      expect(mockDbClient.executeInTransaction).toHaveBeenCalledWith(expect.any(Function));
      expect(mockOperation).toHaveBeenCalledWith(mockTxContext);
      expect(result).toBe("operation-result");
    });

    it("should propagate errors from the operation", async () => {
      const error = new Error("Transaction failed");
      const mockOperation = jest.fn().mockRejectedValue(error);
      mockDbClient.executeInTransaction.mockImplementation(async (op) => op(mockTxContext));

      await expect(repository.testExecuteInTransaction(mockOperation)).rejects.toThrow("Transaction failed");
    });

    it("should handle non-Error operation rejection", async () => {
      const error = "string error";
      const mockOperation = jest.fn().mockRejectedValue(error);
      mockDbClient.executeInTransaction.mockImplementation(async (op) => op(mockTxContext));

      await expect(repository.testExecuteInTransaction(mockOperation)).rejects.toBe("string error");
    });

    it("should handle undefined result", async () => {
      const mockOperation = jest.fn().mockResolvedValue(undefined);
      mockDbClient.executeInTransaction.mockImplementation(async (op) => op(mockTxContext));

      const result = await repository.testExecuteInTransaction(mockOperation);

      expect(result).toBeUndefined();
    });

    it("should handle null result", async () => {
      const mockOperation = jest.fn().mockResolvedValue(null);
      mockDbClient.executeInTransaction.mockImplementation(async (op) => op(mockTxContext));

      const result = await repository.testExecuteInTransaction(mockOperation);

      expect(result).toBeNull();
    });
  });

  describe("withLoggingAndErrorHandling", () => {
    beforeEach(() => {
      jest.spyOn(Date, "now").mockReturnValueOnce(1000).mockReturnValueOnce(1500);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should log success for successful operation with single result", async () => {
      const mockOperation = jest.fn().mockResolvedValue({ id: 1, name: "test" });

      const result = await repository.testWithLoggingAndErrorHandling(mockOperation, "testOperation");

      expect(result).toEqual({ id: 1, name: "test" });
      expect(mockLogger.debug).toHaveBeenCalledWith({
        event: "repository.testOperation.success",
        context: "TestRepository",
        message: "testOperation completed successfully",
        durationMs: 500,
        data: {
          operation: "testOperation",
          resultCount: 1,
        },
      });
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it("should log success for successful operation with array result", async () => {
      const mockOperation = jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);

      await repository.testWithLoggingAndErrorHandling(mockOperation, "fetchMultiple");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resultCount: 3,
          }),
        }),
      );
    });

    it("should log success with resultCount 0 for null result", async () => {
      const mockOperation = jest.fn().mockResolvedValue(null);

      await repository.testWithLoggingAndErrorHandling(mockOperation, "findNonExistent");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resultCount: 0,
          }),
        }),
      );
    });

    it("should log success with resultCount 0 for undefined result", async () => {
      const mockOperation = jest.fn().mockResolvedValue(undefined);

      await repository.testWithLoggingAndErrorHandling(mockOperation, "deleteOperation");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resultCount: 0,
          }),
        }),
      );
    });

    it("should log success with resultCount 0 for empty array", async () => {
      const mockOperation = jest.fn().mockResolvedValue([]);

      await repository.testWithLoggingAndErrorHandling(mockOperation, "emptyQuery");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resultCount: 0,
          }),
        }),
      );
    });

    it("should include additional context in success log", async () => {
      const mockOperation = jest.fn().mockResolvedValue({ id: 1 });
      const additionalContext = { userId: "user-123", action: "create" };

      await repository.testWithLoggingAndErrorHandling(mockOperation, "createUser", additionalContext);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-123",
            action: "create",
          }),
        }),
      );
    });

    it("should log error and rethrow for failed operation", async () => {
      const error = new Error("Database connection failed");
      error.stack = "Error stack trace";
      const mockOperation = jest.fn().mockRejectedValue(error);

      await expect(repository.testWithLoggingAndErrorHandling(mockOperation, "failedOperation")).rejects.toThrow("Database connection failed");

      expect(mockLogger.error).toHaveBeenCalledWith({
        event: "repository.failedOperation.error",
        context: "TestRepository",
        message: "failedOperation operation failed",
        durationMs: 500,
        stack: "Error stack trace",
        data: {
          error: "Database connection failed",
          operation: "failedOperation",
          errorType: "Error",
        },
      });
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it("should handle non-Error exceptions", async () => {
      const mockOperation = jest.fn().mockRejectedValue("string error");

      await expect(repository.testWithLoggingAndErrorHandling(mockOperation, "stringError")).rejects.toBe("string error");

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: undefined,
          data: expect.objectContaining({
            error: "Unknown error",
            errorType: "UnknownError",
          }),
        }),
      );
    });

    it("should include additional context in error log", async () => {
      const error = new Error("Failed");
      const mockOperation = jest.fn().mockRejectedValue(error);
      const additionalContext = { entityId: "entity-456" };

      await expect(repository.testWithLoggingAndErrorHandling(mockOperation, "update", additionalContext)).rejects.toThrow("Failed");

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityId: "entity-456",
          }),
        }),
      );
    });

    it("should handle custom error types", async () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      }

      const error = new CustomError("Custom error occurred");
      const mockOperation = jest.fn().mockRejectedValue(error);

      await expect(repository.testWithLoggingAndErrorHandling(mockOperation, "customError")).rejects.toThrow("Custom error occurred");

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            errorType: "CustomError",
          }),
        }),
      );
    });

    it("should handle error without stack trace", async () => {
      const error = new Error("No stack");
      error.stack = undefined;
      const mockOperation = jest.fn().mockRejectedValue(error);

      await expect(repository.testWithLoggingAndErrorHandling(mockOperation, "noStackError")).rejects.toThrow("No stack");

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: undefined,
        }),
      );
    });
  });

  describe("withSoftLogging", () => {
    beforeEach(() => {
      jest.spyOn(Date, "now").mockReturnValueOnce(2000).mockReturnValueOnce(2750);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should log debug for successful operation", async () => {
      const mockOperation = jest.fn().mockResolvedValue({ data: "success" });

      const result = await repository.testWithSoftLogging(mockOperation, "softOperation");

      expect(result).toEqual({ data: "success" });
      expect(mockLogger.debug).toHaveBeenCalledWith({
        event: "repository.softOperation.completed",
        context: "TestRepository",
        message: "softOperation completed",
        durationMs: 750,
        data: {
          operation: "softOperation",
          resultCount: 1,
        },
      });
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it("should log debug with array result count", async () => {
      const mockOperation = jest.fn().mockResolvedValue([1, 2, 3, 4, 5]);

      await repository.testWithSoftLogging(mockOperation, "fetchAll");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resultCount: 5,
          }),
        }),
      );
    });

    it("should log debug with resultCount 0 for null result", async () => {
      const mockOperation = jest.fn().mockResolvedValue(null);

      await repository.testWithSoftLogging(mockOperation, "softNull");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resultCount: 0,
          }),
        }),
      );
    });

    it("should include additional context in success log", async () => {
      const mockOperation = jest.fn().mockResolvedValue("result");
      const additionalContext = { cacheHit: true, source: "redis" };

      await repository.testWithSoftLogging(mockOperation, "cachedQuery", additionalContext);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cacheHit: true,
            source: "redis",
          }),
        }),
      );
    });

    it("should log warning and rethrow for failed operation", async () => {
      const error = new Error("Soft failure");
      const mockOperation = jest.fn().mockRejectedValue(error);

      await expect(repository.testWithSoftLogging(mockOperation, "softFail")).rejects.toThrow("Soft failure");

      expect(mockLogger.warn).toHaveBeenCalledWith({
        event: "repository.softFail.warning",
        context: "TestRepository",
        message: "softFail completed with warning",
        durationMs: 750,
        data: {
          warning: "Soft failure",
          operation: "softFail",
        },
      });
      expect(mockLogger.debug).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it("should handle non-Error exceptions in warning", async () => {
      const mockOperation = jest.fn().mockRejectedValue({ code: 404, message: "Not found" });

      await expect(repository.testWithSoftLogging(mockOperation, "notFound")).rejects.toEqual({ code: 404, message: "Not found" });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            warning: "Unknown warning",
          }),
        }),
      );
    });

    it("should include additional context in warning log", async () => {
      const error = new Error("Warning");
      const mockOperation = jest.fn().mockRejectedValue(error);
      const additionalContext = { retryCount: 3 };

      await expect(repository.testWithSoftLogging(mockOperation, "retry", additionalContext)).rejects.toThrow("Warning");

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            retryCount: 3,
          }),
        }),
      );
    });

    it("should handle warning without stack trace", async () => {
      const error = new Error("No stack");
      error.stack = undefined;
      const mockOperation = jest.fn().mockRejectedValue(error);

      await expect(repository.testWithSoftLogging(mockOperation, "noStackWarning")).rejects.toThrow("No stack");

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.noStackWarning.warning",
          context: "TestRepository",
          message: "noStackWarning completed with warning",
          durationMs: 750,
          data: expect.objectContaining({
            warning: "No stack",
            operation: "noStackWarning",
          }),
        }),
      );
    });
  });

  describe("timing accuracy", () => {
    it("should calculate duration correctly for withLoggingAndErrorHandling", async () => {
      const dateSpy = jest.spyOn(Date, "now");
      dateSpy.mockReturnValueOnce(5000).mockReturnValueOnce(7500);

      const mockOperation = jest.fn().mockResolvedValue("result");

      await repository.testWithLoggingAndErrorHandling(mockOperation, "timedOp");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: 2500,
        }),
      );

      dateSpy.mockRestore();
    });

    it("should calculate duration correctly for withLoggingAndErrorHandling on error", async () => {
      const dateSpy = jest.spyOn(Date, "now");
      dateSpy.mockReturnValueOnce(10000).mockReturnValueOnce(10500);

      const mockOperation = jest.fn().mockRejectedValue(new Error("fail"));

      await expect(repository.testWithLoggingAndErrorHandling(mockOperation, "timedError")).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: 500,
        }),
      );

      dateSpy.mockRestore();
    });

    it("should calculate duration correctly for withSoftLogging on error", async () => {
      const dateSpy = jest.spyOn(Date, "now");
      dateSpy.mockReturnValueOnce(10000).mockReturnValueOnce(10100);

      const mockOperation = jest.fn().mockRejectedValue(new Error("fail"));

      await expect(repository.testWithSoftLogging(mockOperation, "timedFail")).rejects.toThrow();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: 100,
        }),
      );

      dateSpy.mockRestore();
    });

    it("should handle zero duration operations", async () => {
      const dateSpy = jest.spyOn(Date, "now");
      dateSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1000);

      const mockOperation = jest.fn().mockResolvedValue("fast");

      await repository.testWithLoggingAndErrorHandling(mockOperation, "fastOp");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: 0,
        }),
      );

      dateSpy.mockRestore();
    });
  });

  describe("edge cases", () => {
    it("should handle very large result sets", async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({ id: i }));
      const mockOperation = jest.fn().mockResolvedValue(largeArray);

      await repository.testWithLoggingAndErrorHandling(mockOperation, "largeQuery");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resultCount: 10000,
          }),
        }),
      );
    });

    it("should handle operation with boolean result", async () => {
      const mockOperation = jest.fn().mockResolvedValue(true);

      await repository.testWithLoggingAndErrorHandling(mockOperation, "booleanOp");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resultCount: 1,
          }),
        }),
      );
    });

    it("should handle operation with number result", async () => {
      const mockOperation = jest.fn().mockResolvedValue(42);

      await repository.testWithLoggingAndErrorHandling(mockOperation, "numberOp");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resultCount: 1,
          }),
        }),
      );
    });

    it("should handle operation with string result", async () => {
      const mockOperation = jest.fn().mockResolvedValue("hello");

      await repository.testWithLoggingAndErrorHandling(mockOperation, "stringOp");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resultCount: 1,
          }),
        }),
      );
    });

    it("should handle nested operations with logging", async () => {
      const nestedOperation = jest.fn().mockResolvedValue("nested");
      const outerOperation = jest.fn().mockImplementation(async () => {
        const result = await repository.testWithLoggingAndErrorHandling(nestedOperation, "nested");
        return { outer: "result", nested: result };
      });

      const result = await repository.testWithLoggingAndErrorHandling(outerOperation, "outer");

      expect(result).toEqual({ outer: "result", nested: "nested" });
      expect(mockLogger.debug).toHaveBeenCalledTimes(2);
    });

    it("should handle operation that throws after partial work", async () => {
      let partialWorkDone = false;
      const mockOperation = jest.fn().mockImplementation(async () => {
        partialWorkDone = true;
        throw new Error("Partial work failed");
      });

      await expect(repository.testWithLoggingAndErrorHandling(mockOperation, "partialWork")).rejects.toThrow("Partial work failed");

      expect(partialWorkDone).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("logging consistency", () => {
    it("should use consistent event naming", async () => {
      const mockOperation = jest.fn().mockResolvedValue("result");

      await repository.testWithLoggingAndErrorHandling(mockOperation, "consistentEvent");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "repository.consistentEvent.success",
        }),
      );
    });

    it("should include repository name in all logs", async () => {
      const mockOperation = jest.fn().mockResolvedValue("result");

      await repository.testWithLoggingAndErrorHandling(mockOperation, "test");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          context: "TestRepository",
        }),
      );
    });

    it("should include operation name in all logs", async () => {
      const mockOperation = jest.fn().mockResolvedValue("result");

      await repository.testWithLoggingAndErrorHandling(mockOperation, "operationWithName");

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            operation: "operationWithName",
          }),
        }),
      );
    });
  });
});
