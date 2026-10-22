import { DatabaseClient, Transactional, TransactionContext } from "@/infrastructure/database/database.type";
import { LoggerPort } from "@/application/ports/driven/logger.port";

export abstract class BaseRepository<T extends Transactional<T>> implements Transactional<T> {
  protected abstract repositoryName: string;

  constructor(
    protected readonly logger: LoggerPort,
    protected readonly dbClient: DatabaseClient,
  ) {}

  abstract withTransaction(tx: TransactionContext): T;

  protected async executeInTransaction<R>(operation: (tx: TransactionContext) => Promise<R>): Promise<R> {
    return await this.dbClient.executeInTransaction(operation);
  }

  protected async withLoggingAndErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string,
    additionalContext?: Record<string, unknown>,
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      this.logger.debug({
        event: `repository.${operationName}.success`,
        context: this.repositoryName,
        message: `${operationName} completed successfully`,
        durationMs: duration,
        data: {
          operation: operationName,
          resultCount: Array.isArray(result) ? result.length : result ? 1 : 0,
          ...additionalContext,
        },
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error({
        event: `repository.${operationName}.error`,
        context: this.repositoryName,
        message: `${operationName} operation failed`,
        durationMs: duration,
        stack: error instanceof Error ? error.stack : undefined,
        data: {
          error: error instanceof Error ? error.message : "Unknown error",
          operation: operationName,
          errorType: error instanceof Error ? error.constructor.name : "UnknownError",
          ...additionalContext,
        },
      });

      throw error;
    }
  }

  protected async withSoftLogging<T>(operation: () => Promise<T>, operationName: string, additionalContext?: Record<string, unknown>): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      this.logger.debug({
        event: `repository.${operationName}.completed`,
        context: this.repositoryName,
        message: `${operationName} completed`,
        durationMs: duration,
        data: {
          operation: operationName,
          resultCount: Array.isArray(result) ? result.length : result ? 1 : 0,
          ...additionalContext,
        },
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.warn({
        event: `repository.${operationName}.warning`,
        context: this.repositoryName,
        message: `${operationName} completed with warning`,
        durationMs: duration,
        data: {
          warning: error instanceof Error ? error.message : "Unknown warning",
          operation: operationName,
          ...additionalContext,
        },
      });

      throw error;
    }
  }
}
