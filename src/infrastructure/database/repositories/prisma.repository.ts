import { Transactional, TransactionContext } from "@/infrastructure/database/database.type";
import { BaseRepository } from "./base.repository";
import { PrismaDatabaseClient } from "../prisma-database-client";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { PrismaTransactionContext } from "../prisma-transaction-context";

export abstract class PrismaRepository<T extends Transactional<T>> extends BaseRepository<T> implements Transactional<T> {
  constructor(
    protected readonly logger: LoggerPort,
    protected readonly dbClient: PrismaDatabaseClient,
    protected readonly transactionContext?: PrismaTransactionContext,
  ) {
    super(logger, dbClient);

    this.dbClient = dbClient;
  }

  protected get prisma() {
    return this.transactionContext?.prismaTransaction;
  }

  protected async getPrismaClient() {
    return this.prisma ?? (await this.dbClient.getPrismaClient());
  }

  protected createTransactionalInstance(tx: TransactionContext): T {
    if (!(tx instanceof PrismaTransactionContext)) {
      this.logger.error({
        context: this.repositoryName,
        event: "createTransactionalInstance",
        message: `Invalid transaction context for ${this.repositoryName}. Expected PrismaTransactionContext.`,
      });
      throw new Error(`Invalid transaction context for ${this.repositoryName}. Expected PrismaTransactionContext.`);
    }

    const RepositoryClass = this.constructor as new (
      logger: LoggerPort,
      dbClient: PrismaDatabaseClient,
      transactionContext?: PrismaTransactionContext,
    ) => T;

    return new RepositoryClass(this.logger, this.dbClient as PrismaDatabaseClient, tx);
  }
}
