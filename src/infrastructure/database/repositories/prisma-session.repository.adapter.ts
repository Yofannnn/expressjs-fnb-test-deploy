import { Session } from "@/domain/entities/session.entity";
import { SessionRepositoryPort } from "@/application/ports/driven/session.repository.port";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { Transactional, TransactionContext } from "@/infrastructure/database/database.type";
import { PrismaRepository } from "./prisma.repository";
import { PrismaDatabaseClient } from "../prisma-database-client";
import { PrismaTransactionContext } from "../prisma-transaction-context";
import { Session as PrismaSession } from "../../../../prisma/generated";

export class PrismaSessionRepositoryAdapter
  extends PrismaRepository<PrismaSessionRepositoryAdapter>
  implements SessionRepositoryPort, Transactional<PrismaSessionRepositoryAdapter>
{
  protected repositoryName = "PrismaSessionRepositoryAdapter";

  constructor(
    protected readonly logger: LoggerPort,
    protected readonly dbClient: PrismaDatabaseClient,
    protected readonly transactionContext?: PrismaTransactionContext,
  ) {
    super(logger, dbClient, transactionContext);
  }

  withTransaction(tx: TransactionContext): PrismaSessionRepositoryAdapter {
    return this.createTransactionalInstance(tx);
  }

  async insert(session: Session): Promise<void> {
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        await prisma.session.create({
          data: this.toPrismaData(session),
        });
      },
      "insert",
      {
        userId: session.getUserId(),
      },
    );
  }

  async update(session: Session): Promise<void> {
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        await prisma.session.update({
          where: { id: session.getId() },
          data: this.toPrismaData(session),
        });
      },
      "update",
      {
        userId: session.getUserId(),
      },
    );
  }

  async findById(sessionId: string): Promise<Session | null> {
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        const session = await prisma.session.findUnique({
          where: { id: sessionId },
        });
        return !session ? null : this.toEntity(session);
      },
      "findById",
      { sessionId },
    );
  }

  async revokeTokenFamily(tokenFamily: string, revokeReason?: string): Promise<void> {
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        await prisma.session.updateMany({
          where: { tokenFamily, revokedAt: null },
          data: { revokedAt: new Date(), revokeReason },
        });
      },
      "revokeTokenFamily",
      { tokenFamily },
    );
  }

  async revokeAllSessionsForUser(userId: string, revokeReason: string): Promise<void> {
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        await prisma.session.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date(), revokeReason },
        });
      },
      "revokeAllSessions",
      { userId },
    );
  }

  private toPrismaData(session: Session) {
    return {
      id: session.getId(),
      tokenFingerprint: session.getTokenFingerprint(),
      tokenFamily: session.getTokenFamily(),
      userId: session.getUserId(),
      expiresAt: session.getExpiresAt(),
      revokedAt: session.getRevokedAt(),
      revokeReason: session.getRevokeReason(),
      userAgent: session.getUserAgent(),
      ipAddress: session.getIpAddress(),
      deviceId: session.getDeviceId(),
      createdAt: session.getCreatedAt(),
      updatedAt: session.getUpdatedAt(),
    };
  }

  private toEntity(session: PrismaSession): Session {
    return Session.rebuild(session);
  }
}
