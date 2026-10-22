import { UserRepositoryPort } from "@/application/ports/driven/user.repository.port";
import { User } from "@/domain/entities/user.entity";
import { LoggerPort } from "@/application/ports/driven/logger.port";
import { UserRoleType, UserStatusType } from "@/domain/types/user.type";
import { Transactional, TransactionContext } from "@/infrastructure/database/database.type";
import { PrismaRepository } from "./prisma.repository";
import { PrismaDatabaseClient } from "../prisma-database-client";
import { PrismaTransactionContext } from "../prisma-transaction-context";
import { EmailExistsException } from "@/application/exceptions/user.exceptions";
import { User as PrismaUser } from "../../../../prisma/generated";

export class PrismaUserRepositoryAdapter
  extends PrismaRepository<PrismaUserRepositoryAdapter>
  implements UserRepositoryPort, Transactional<PrismaUserRepositoryAdapter>
{
  protected repositoryName = "PrismaUserRepositoryAdapter";

  constructor(
    protected readonly logger: LoggerPort,
    protected readonly dbClient: PrismaDatabaseClient,
    protected readonly transactionContext?: PrismaTransactionContext,
  ) {
    super(logger, dbClient, transactionContext);
  }

  withTransaction(tx: TransactionContext): PrismaUserRepositoryAdapter {
    return this.createTransactionalInstance(tx);
  }

  async findById(id: string): Promise<User | null> {
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        const user = await prisma.user.findUnique({
          where: { id },
        });

        return user ? this.toEntity(user) : null;
      },
      "findById",
      { id },
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        const user = await prisma.user.findUnique({
          where: { email },
        });

        return user ? this.toEntity(user) : null;
      },
      "findByEmail",
      { email },
    );
  }

  async insert(user: User): Promise<void> {
    try {
      await this.withLoggingAndErrorHandling(
        async () => {
          const prisma = await this.getPrismaClient();
          await prisma.user.create({
            data: this.toPrismaData(user),
          });
        },
        "insert",
        { email: user.getEmail() },
      );
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "23505" &&
        (error as { constraint?: string }).constraint?.includes("email")
      ) {
        throw new EmailExistsException();
      }

      throw error;
    }
  }

  async update(user: User): Promise<void> {
    await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        await prisma.user.update({
          where: { id: user.getId() },
          data: this.toPrismaData(user),
        });
      },
      "update",
      { email: user.getEmail() },
    );
  }

  async delete(id: string): Promise<void> {
    return await this.withLoggingAndErrorHandling(
      async () => {
        const prisma = await this.getPrismaClient();
        await prisma.user.delete({ where: { id } });
      },
      "delete",
      { id },
    );
  }

  private toPrismaData(user: User) {
    return {
      id: user.getId(),
      name: user.getName(),
      address: user.getAddress(),
      email: user.getEmail(),
      hashedPassword: user.getHashedPasswordForAuthentication(),
      role: user.getRole(),
      status: user.getStatus(),
      suspendReason: user.getSuspendReason(),
      suspendedAt: user.getSuspendedAt(),
      bannedReason: user.getBannedReason(),
      bannedAt: user.getBannedAt(),
      emailVerifiedAt: user.getEmailVerifiedAt(),
      accountLockedUntil: user.getAccountLockedUntil(),
      failedLoginAttempts: user.getFailedLoginAttempts(),
      lastFailedLoginAt: user.getLastFailedLoginAt(),
      lastLoginAt: user.getLastLoginAt(),
      emailChangedAt: user.getEmailChangedAt(),
      passwordChangedAt: user.getPasswordChangedAt(),
      lastLogoutAt: user.getLastLogoutAt(),
      createdAt: user.getCreatedAt(),
      updatedAt: user.getUpdatedAt(),
    };
  }

  private toEntity(user: PrismaUser): User {
    return User.rebuild({
      id: user.id,
      profile: { name: user.name, address: user.address },
      email: { email: user.email, changedAt: user.emailChangedAt, verifiedAt: user.emailVerifiedAt },
      password: { hashedPassword: user.hashedPassword, changedAt: user.passwordChangedAt },
      role: user.role as UserRoleType,
      status: {
        status: user.status as UserStatusType,
        bannedAt: user.bannedAt,
        bannedReason: user.bannedReason,
        suspendedAt: user.suspendedAt,
        suspendReason: user.suspendReason,
      },
      security: {
        accountLockedUntil: user.accountLockedUntil,
        failedLoginAttempts: user.failedLoginAttempts,
        lastLogoutAt: user.lastLogoutAt,
        lastLoginAt: user.lastLoginAt,
        lastFailedLoginAt: user.lastFailedLoginAt,
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
