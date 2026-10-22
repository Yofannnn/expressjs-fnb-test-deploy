import { PaymentTransactionRepositoryPort } from "@/application/ports/driven/payment-transaction.repository.port";
import { PrismaRepository } from "./prisma.repository";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { PrismaDatabaseClient } from "../prisma-database-client";
import { PrismaTransactionContext } from "../prisma-transaction-context";
import { Transactional, TransactionContext } from "@/infrastructure/database/database.type";
import { PaymentTransaction } from "@/domain/entities/payment-transaction.entity";
import { PaymentMethod, PaymentTransactionStatus, PaymentTransactionType } from "@/domain/types/payment-transaction.type";
import { Prisma, PaymentTransaction as PrismaPaymentTransaction } from "../../../../prisma/generated";

export class PrismaPaymentTransactionRepositoryAdapter
  extends PrismaRepository<PrismaPaymentTransactionRepositoryAdapter>
  implements PaymentTransactionRepositoryPort, Transactional<PrismaPaymentTransactionRepositoryAdapter>
{
  protected repositoryName = "PrismaPaymentTransactionRepositoryAdapter";

  constructor(
    protected readonly logger: LoggerPort,
    protected readonly dbClient: PrismaDatabaseClient,
    protected readonly transactionContext?: PrismaTransactionContext,
  ) {
    super(logger, dbClient, transactionContext);
  }

  withTransaction(tx: TransactionContext): PrismaPaymentTransactionRepositoryAdapter {
    return this.createTransactionalInstance(tx);
  }

  async insert(paymentTransaction: PaymentTransaction): Promise<void> {
    await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        await prisma.paymentTransaction.create({
          data: {
            id: paymentTransaction.getId(),
            orderId: paymentTransaction.getOrderId(),
            type: paymentTransaction.getType(),
            amount: paymentTransaction.getAmount().getAmount(),
            provider: paymentTransaction.getProvider(),
            parentTransactionId: paymentTransaction.getParentTransactionId(),
            ...this.mutableData(paymentTransaction),
            createdAt: paymentTransaction.getCreatedAt(),
          },
        });
      },
      "insert",
      {},
    );
  }

  async update(transaction: PaymentTransaction): Promise<void> {
    await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();

        await prisma.paymentTransaction.update({
          where: {
            id: transaction.getId(),
          },
          data: this.mutableData(transaction),
        });
      },
      "update",
      {
        id: transaction.getId(),
      },
    );
  }

  async findById(id: string): Promise<PaymentTransaction | null> {
    return this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();

        const transaction = await prisma.paymentTransaction.findUnique({
          where: {
            id,
          },
        });

        return transaction ? this.toEntity(transaction) : null;
      },
      "findById",
      { id },
    );
  }

  async findByOrderId(orderId: string): Promise<PaymentTransaction[]> {
    return this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();

        const transactions = await prisma.paymentTransaction.findMany({
          where: {
            orderId,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        return transactions.map((t) => this.toEntity(t));
      },
      "findByOrderId",
      { orderId },
    );
  }

  async findByProviderReferenceId(providerReferenceId: string): Promise<PaymentTransaction | null> {
    return this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();

        const transaction = await prisma.paymentTransaction.findFirst({
          where: {
            providerReferenceId,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return transaction ? this.toEntity(transaction) : null;
      },
      "findByProviderReferenceId",
      { providerReferenceId },
    );
  }

  private mutableData(transaction: PaymentTransaction) {
    return {
      status: transaction.getStatus(),
      method: transaction.getMethod(),
      providerReferenceId: transaction.getProviderReferenceId(),
      failureReason: transaction.getFailureReason(),
      completedAt: transaction.getCompletedAt(),
      metadata: this.toJsonInput(transaction.getMetadata()),
      updatedAt: transaction.getUpdatedAt(),
    };
  }

  private toJsonInput(metadata: Record<string, unknown> | null): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    return metadata === null ? Prisma.JsonNull : (metadata as Prisma.InputJsonValue);
  }

  private toEntity(data: PrismaPaymentTransaction): PaymentTransaction {
    return PaymentTransaction.rebuild({
      id: data.id,
      orderId: data.orderId,
      status: data.status as PaymentTransactionStatus,
      method: data.method as PaymentMethod,
      type: data.type as PaymentTransactionType,
      amount: data.amount,
      provider: data.provider,
      parentTransactionId: data.parentTransactionId,
      providerReferenceId: data.providerReferenceId,
      failureReason: data.failureReason,
      completedAt: data.completedAt,
      metadata: data.metadata as Record<string, unknown> | null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
