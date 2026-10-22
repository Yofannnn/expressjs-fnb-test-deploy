import { ApplicationTokenRepositoryPort } from "@/application/ports/driven/application-token.repository.port";
import { ApplicationToken, GuestOrderManagementToken, PasswordResetToken, VerificationEmailToken } from "@/domain/entities/application-token.entity";
import { ApplicationTokenType } from "@/domain/types/application-token.type";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { PrismaRepository } from "./prisma.repository";
import { Transactional, TransactionContext } from "@/infrastructure/database/database.type";
import { PrismaDatabaseClient } from "../prisma-database-client";
import { PrismaTransactionContext } from "../prisma-transaction-context";
import { ApplicationToken as PrismaApplicationToken } from "../../../../prisma/generated";

export class PrismaApplicationTokenRepositoryAdapter
  extends PrismaRepository<PrismaApplicationTokenRepositoryAdapter>
  implements ApplicationTokenRepositoryPort, Transactional<PrismaApplicationTokenRepositoryAdapter>
{
  protected repositoryName = "PrismaApplicationTokenRepositoryAdapter";

  constructor(
    protected readonly logger: LoggerPort,
    protected readonly dbClient: PrismaDatabaseClient,
    protected readonly transactionContext?: PrismaTransactionContext,
  ) {
    super(logger, dbClient, transactionContext);
  }

  withTransaction(tx: TransactionContext): PrismaApplicationTokenRepositoryAdapter {
    return this.createTransactionalInstance(tx);
  }

  async insert(applicationToken: ApplicationToken): Promise<void> {
    const tokenPlainObject = this.toPrismaData(applicationToken);
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        await prisma.applicationToken.create({
          data: tokenPlainObject,
        });
      },
      "insert",
      { type: tokenPlainObject.type, expires: tokenPlainObject.expires },
    );
  }

  async update(applicationToken: ApplicationToken): Promise<void> {
    const tokenPlainObject = this.toPrismaData(applicationToken);
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        await prisma.applicationToken.update({
          where: { tokenFingerprint: tokenPlainObject.tokenFingerprint },
          data: tokenPlainObject,
        });
      },
      "update",
      { type: tokenPlainObject.type, expires: tokenPlainObject.expires, usedAt: tokenPlainObject.usedAt },
    );
  }

  async invalidateByTypeAndIdentifier(type: ApplicationTokenType, identifier: string): Promise<void> {
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        await prisma.applicationToken.updateMany({
          where: { type, identifier, usedAt: null },
          data: { usedAt: new Date() },
        });
      },
      "invalidateByTypeAndIdentifier",
      {
        type,
        identifier,
      },
    );
  }

  async countByTypeAndIdentifierWithin(type: ApplicationTokenType, identifier: string, windowMs: number): Promise<number> {
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        return await prisma.applicationToken.count({
          where: { type, identifier, usedAt: null, createdAt: { gt: new Date(Date.now() - windowMs) } },
        });
      },
      "countByTypeAndIdentifierWithin",
      {
        type,
        identifier,
      },
    );
  }

  async findByTokenFingerprint(tokenFingerprint: string, identifier?: string): Promise<ApplicationToken | null> {
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        const applicationToken = await prisma.applicationToken.findUnique({ where: { tokenFingerprint, identifier } });
        return !applicationToken ? null : this.toEntity(applicationToken);
      },
      "findByTokenFingerprint",
      {},
    );
  }

  async findValidTokenByTypeAndIdentifier(type: ApplicationTokenType, identifier: string): Promise<ApplicationToken | null> {
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        const applicationToken = await prisma.applicationToken.findFirst({
          where: { type, identifier, usedAt: null, expires: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
        });
        return !applicationToken ? null : this.toEntity(applicationToken);
      },
      "findValidTokenByTypeAndIdentifier",
      { type, identifier },
    );
  }

  async findLastTokenByTypeAndIdentifier(type: ApplicationTokenType, identifier: string): Promise<ApplicationToken | null> {
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        const applicationToken = await prisma.applicationToken.findFirst({
          where: { type, identifier },
          orderBy: { createdAt: "desc" },
        });
        return !applicationToken ? null : this.toEntity(applicationToken);
      },
      "findLastTokenByTypeAndIdentifier",
      {},
    );
  }

  private toPrismaData(applicationToken: ApplicationToken) {
    return {
      id: applicationToken.getId(),
      tokenFingerprint: applicationToken.getTokenFingerprint(),
      identifier: applicationToken.getIdentifier(),
      expires: applicationToken.getExpiresAt(),
      type: applicationToken.getType(),
      usedAt: applicationToken.getUsedAt(),
      createdAt: applicationToken.getCreatedAt(),
      updatedAt: applicationToken.getUpdatedAt(),
      orderId: applicationToken instanceof GuestOrderManagementToken ? applicationToken.getOrderId() : null,
      userId:
        applicationToken instanceof VerificationEmailToken || applicationToken instanceof PasswordResetToken ? applicationToken.getUserId() : null,
    };
  }

  private toEntity(applicationToken: PrismaApplicationToken): ApplicationToken {
    if (applicationToken.type === ApplicationTokenType.VERIFICATION_EMAIL) {
      return VerificationEmailToken.rebuild({
        id: applicationToken.id,
        tokenFingerprint: applicationToken.tokenFingerprint,
        userId: applicationToken.userId as string,
        identifier: applicationToken.identifier as string,
        expiresAt: applicationToken.expires,
        type: applicationToken.type as ApplicationTokenType,
        usedAt: applicationToken.usedAt,
        createdAt: applicationToken.createdAt,
        updatedAt: applicationToken.updatedAt,
      });
    }

    if (applicationToken.type === ApplicationTokenType.PASSWORD_RESET) {
      return PasswordResetToken.rebuild({
        id: applicationToken.id,
        identifier: applicationToken.identifier as string,
        userId: applicationToken.userId as string,
        tokenFingerprint: applicationToken.tokenFingerprint,
        expiresAt: applicationToken.expires,
        type: applicationToken.type as ApplicationTokenType,
        usedAt: applicationToken.usedAt,
        createdAt: applicationToken.createdAt,
        updatedAt: applicationToken.updatedAt,
      });
    }

    if (applicationToken.type === ApplicationTokenType.GUEST_ORDER_MANAGEMENT) {
      return GuestOrderManagementToken.rebuild({
        id: applicationToken.id,
        expiresAt: applicationToken.expires,
        tokenFingerprint: applicationToken.tokenFingerprint,
        identifier: applicationToken.identifier as string,
        orderId: applicationToken.orderId as string,
        createdAt: applicationToken.createdAt,
        updatedAt: applicationToken.updatedAt,
      });
    }

    throw new Error(`Unknown application token type: ${applicationToken.type}`);
  }
}
