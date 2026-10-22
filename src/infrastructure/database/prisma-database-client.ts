import { LoggerPort } from "@/application/ports/driven/logger.port";
import { DatabaseClient, TransactionContext } from "@/infrastructure/database/database.type";
import { PrismaTransactionContext } from "./prisma-transaction-context";
import { CircuitBreaker } from "../circuit-breaker/circuit-breaker";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaDatabaseConfig } from "../configs/prisma-database.config";
import { Prisma, PrismaClient } from "../../../prisma/generated";
import { CircuitBreakerFactory } from "../circuit-breaker/circuit-breaker.factory";
import { BaseDomainException } from "@/domain/exceptions/base-domain.exception";
import { BaseApplicationException } from "@/application/exceptions/base-application.exception";

export class PrismaDatabaseClient implements DatabaseClient {
  private readonly circuitBreaker: CircuitBreaker;
  private prisma: PrismaClient;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private transactionCounter = 0;

  constructor(
    private readonly dbConfig: PrismaDatabaseConfig,
    protected readonly logger: LoggerPort,
    private readonly circuitBreakerFactory: CircuitBreakerFactory,
  ) {
    this.circuitBreaker = this.circuitBreakerFactory.create({
      failureThreshold: 3,
      cooldownPeriod: 30_000,
      halfOpenMaxCalls: 1,
      timeWindow: 180_000,
      name: "DatabaseCircuitBreaker",
      isFailure: (error: unknown) => !BaseDomainException.isDomainException(error) || !BaseApplicationException.isApplicationException(error),
    });
    const pool = new Pool({ connectionString: this.dbConfig.databaseUrl });
    const adapter = new PrismaPg(pool);
    this.prisma = new PrismaClient({
      adapter,
      log: [
        { emit: "event", level: "query" },
        { emit: "event", level: "error" },
        { emit: "event", level: "info" },
        { emit: "event", level: "warn" },
      ],
    });
  }

  private async initialize(): Promise<void> {
    try {
      await this.prisma.$connect();

      this.setupEventListeners();

      this.isInitialized = true;

      this.logger.info({
        context: "PrismaDatabaseClient",
        event: "client.initialized",
        message: "Prisma client initialized successfully",
      });
    } catch (error) {
      this.logger.error({
        context: "PrismaDatabaseClient",
        event: "client.initialization_failed",
        message: error instanceof Error ? error.message : "Prisma client initialization failed",
        stack: error instanceof Error ? error.stack : undefined,
      });

      this.initPromise = null;

      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;

    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }

    await this.initPromise;
  }

  private setupEventListeners(): void {
    (this.prisma as any).$on("info", (e: Prisma.LogEvent) => {
      this.logger.info({
        event: "prisma.info",
        context: "PrismaDatabaseClient",
        message: "Prisma info event",
        data: e,
      });
    });

    (this.prisma as any).$on("warn", (e: Prisma.LogEvent) => {
      this.logger.warn({
        event: "prisma.warn",
        context: "PrismaDatabaseClient",
        message: "Prisma warning",
        data: e,
      });
    });

    (this.prisma as any).$on("error", (e: Prisma.LogEvent) => {
      this.logger.error({
        event: "prisma.error",
        context: "PrismaDatabaseClient",
        message: "Prisma error occurred",
        data: e,
      });
    });
  }

  async executeInTransaction<T>(operation: (tx: TransactionContext) => Promise<T>): Promise<T> {
    await this.ensureInitialized();

    const startTime = Date.now();

    if (!this.isInitialized) {
      this.logger.error({
        event: "transaction.not_initialized",
        context: "PrismaDatabaseClient",
        message: "Database client not initialized",
      });
      throw new Error("Database client not initialized");
    }

    this.logger.debug({
      event: "transaction.start",
      context: "PrismaDatabaseClient",
      message: "Starting database transaction",
    });
    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await this.prisma.$transaction(async (prismaTx) => {
          const txContext = new PrismaTransactionContext(prismaTx);
          return await operation(txContext);
        });
      }, `executeInTransaction-${++this.transactionCounter}`);

      this.logger.debug({
        event: "transaction.success",
        context: "PrismaDatabaseClient",
        message: "Database transaction completed successfully",
        durationMs: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      this.logger.error({
        event: "prisma.transaction.error",
        context: "PrismaService",
        durationMs: Date.now() - startTime,
        message: error instanceof Error ? error.message : "Database transaction failed",
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  }
  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.logger.info({
        event: "health_check.success",
        context: "PrismaDatabaseClient",
        message: "Database health check passed",
      });
      return true;
    } catch (error) {
      this.logger.error({
        event: "health_check.error",
        context: "PrismaDatabaseClient",
        message: error instanceof Error ? error.message : "Database health check failed",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.logger.info({
        event: "client.disconnected",
        context: "PrismaDatabaseClient",
        message: "Database client disconnected successfully",
      });
    } catch (error) {
      this.logger.error({
        event: "disconnect.error",
        context: "PrismaDatabaseClient",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async getPrismaClient(): Promise<PrismaClient> {
    await this.ensureInitialized();

    return this.prisma;
  }
}
