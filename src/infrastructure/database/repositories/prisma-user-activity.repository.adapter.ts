import { UserActivityRepositoryPort } from "@/application/ports/driven/user-activity.repository.port";
import { PrismaRepository } from "./prisma.repository";
import { Transactional, TransactionContext } from "../database.type";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { PrismaDatabaseClient } from "../prisma-database-client";
import { PrismaTransactionContext } from "../prisma-transaction-context";
import { UserActivity } from "@/domain/value-objects/user-activity.vo";
import { UserActivityType } from "@/domain/types/user.type";
import { Prisma, UserActivity as PrismaUserActivity } from "../../../../prisma/generated";

export class PrismaUserActivityRepositoryAdapter
  extends PrismaRepository<PrismaUserActivityRepositoryAdapter>
  implements UserActivityRepositoryPort, Transactional<PrismaUserActivityRepositoryAdapter>
{
  protected repositoryName = "PrismaUserActivityRepositoryAdapter";

  constructor(
    protected readonly logger: LoggerPort,
    protected readonly dbClient: PrismaDatabaseClient,
    protected readonly transactionContext?: PrismaTransactionContext,
  ) {
    super(logger, dbClient, transactionContext);
  }

  withTransaction(tx: TransactionContext): PrismaUserActivityRepositoryAdapter {
    return this.createTransactionalInstance(tx);
  }

  async insert(userActivity: UserActivity): Promise<void> {
    await this.withLoggingAndErrorHandling(async () => {
      const prisma = await this.getPrismaClient();
      await prisma.userActivity.create({
        data: this.toPrismaData(userActivity),
      });
    }, "insert");
  }

  async findLatestByUserId(userId: string): Promise<UserActivity | null> {
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        const userActivity = await prisma.userActivity.findFirst({
          where: { userId },
          orderBy: { occurredAt: "desc" },
        });

        return userActivity ? this.toValueObject(userActivity) : null;
      },
      "findLatestByUserId",
      { userId },
    );
  }

  async findByUserId(userId: string): Promise<UserActivity[]> {
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        const userActivities = await prisma.userActivity.findMany({
          where: { userId },
        });

        return userActivities.map((userActivity) => this.toValueObject(userActivity));
      },
      "findByUserId",
      { userId },
    );
  }

  private toPrismaData(userActivity: UserActivity) {
    return {
      userId: userActivity.getUserId(),
      action: userActivity.getAction(),
      description: userActivity.getDescription(),
      userAgent: userActivity.getUserAgent(),
      ipAddress: userActivity.getIpAddress(),
      metadata: userActivity.getMetadata() === null ? undefined : JSON.stringify(userActivity.getMetadata()),
      occurredAt: userActivity.getOccurredAt(),
    };
  }

  private toValueObject(userActivity: PrismaUserActivity): UserActivity {
    return UserActivity.rebuild({
      userId: userActivity.userId,
      action: userActivity.action as UserActivityType,
      description: userActivity.description,
      userAgent: userActivity.userAgent,
      ipAddress: userActivity.ipAddress,
      metadata: this.toMetadata(userActivity.metadata),
      occurredAt: userActivity.occurredAt,
    });
  }

  private toMetadata(metadata: Prisma.JsonValue | null): Record<string, unknown> | null {
    if (metadata === null) {
      return null;
    }

    if (typeof metadata !== "object" || Array.isArray(metadata)) {
      throw new Error("User activity metadata must be a JSON object");
    }

    return metadata as Record<string, unknown>;
  }
}
